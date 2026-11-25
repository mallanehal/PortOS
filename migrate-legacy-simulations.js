const path = require("path");
require("dotenv").config({ path: path.join(__dirname, ".env") });
const mysql = require("mysql2/promise");

// Translate each frontend collection into the resource_type values stored in MySQL.
const resourceTypes = [
    { key: "berths", type: "berth" },
    { key: "cranes", type: "crane" },
    { key: "trucks", type: "truck" },
];

// Check values against the range supported by the relational INT UNSIGNED columns.
function databaseInteger(value, label, minimum = 0) {
    if (!Number.isSafeInteger(value) || value < minimum || value > 4294967295) {
        throw new Error(`${label} is not a valid database integer`);
    }
    return value;
}

// Parse the JSON configuration from the earlier saved_simulations table.
function parseConfiguration(value, legacyId) {
    const configuration = typeof value === "string" ? JSON.parse(value) : value;
    const keys = ["berths", "cranes", "trucks", "ships", "processes"];
    if (!configuration || keys.some((key) => !Array.isArray(configuration[key]))) {
        throw new Error(`Legacy simulation ${legacyId} has an invalid configuration`);
    }
    return configuration;
}

// Add the legacy ID marker on older installations so migration can safely be rerun.
async function ensureLegacyIdColumn(connection) {
    const [columns] = await connection.query(
        "SHOW COLUMNS FROM simulations LIKE 'legacy_saved_simulation_id'"
    );
    if (columns.length === 0) {
        await connection.query(`
            ALTER TABLE simulations
            ADD COLUMN legacy_saved_simulation_id BIGINT UNSIGNED NULL,
            ADD UNIQUE KEY uq_simulations_legacy_saved (legacy_saved_simulation_id)
        `);
    }
}

// Copy one old JSON record into the normalized tables within a single transaction.
async function migrateSimulation(connection, legacySimulation) {
    const legacyId = databaseInteger(Number(legacySimulation.simulation_id), "Legacy simulation ID", 1);
    const configuration = parseConfiguration(legacySimulation.configuration, legacyId);
    const [existing] = await connection.execute(
        "SELECT simulation_id FROM simulations WHERE legacy_saved_simulation_id = ?",
        [legacyId]
    );
    if (existing.length) return false;
    if (!legacySimulation.name || legacySimulation.name.length > 120) {
        throw new Error(`Legacy simulation ${legacyId} has an invalid name`);
    }

    await connection.beginTransaction();
    try {
        const [simulationResult] = await connection.execute(
            `INSERT INTO simulations (legacy_saved_simulation_id, name, created_at)
             VALUES (?, ?, ?)`,
            [legacyId, legacySimulation.name, legacySimulation.created_at]
        );
        const simulationId = simulationResult.insertId;
        const resourceRows = [];
        for (const resourceType of resourceTypes) {
            const ids = new Set();
            for (const resource of configuration[resourceType.key]) {
                const number = databaseInteger(resource?.num, `${resourceType.type} ID`, 1);
                if (!["Small", "Medium", "Large"].includes(resource.size) || ids.has(number)) {
                    throw new Error(`Legacy simulation ${legacyId} has invalid ${resourceType.key}`);
                }
                ids.add(number);
                resourceRows.push([simulationId, resourceType.type, number, resource.size]);
            }
        }
        if (resourceRows.length) {
            await connection.query(
                `INSERT INTO resources (simulation_id, resource_type, resource_number, size)
                 VALUES ${resourceRows.map(() => "(?, ?, ?, ?)").join(", ")}`,
                resourceRows.flat()
            );
        }

        const databaseShipIds = new Map();
        for (const ship of configuration.ships) {
            const sourceId = databaseInteger(ship?.ship_id, "Ship ID", 1);
            if (databaseShipIds.has(sourceId) || !ship.name || !ship.type) {
                throw new Error(`Legacy simulation ${legacyId} has invalid ships`);
            }
            const [shipResult] = await connection.execute(
                `INSERT INTO ships (simulation_id, source_ship_id, name, type, country, captain_name)
                 VALUES (?, ?, ?, ?, ?, ?)`,
                [simulationId, sourceId, ship.name, ship.type, ship.country ?? "", ship.captain_name ?? ""]
            );
            databaseShipIds.set(sourceId, shipResult.insertId);
        }

        const requestRows = configuration.processes.map((process) => {
            const pid = databaseInteger(process?.pid, "Request PID", 1);
            const sourceShipId = databaseInteger(process.ship_id, `P${pid} ship ID`, 1);
            const shipId = databaseShipIds.get(sourceShipId);
            if (!shipId) throw new Error(`Legacy simulation ${legacyId} P${pid} refers to an unknown ship`);
            return [
                simulationId,
                pid,
                shipId,
                databaseInteger(process.priority, `P${pid} priority`, 1),
                databaseInteger(process.arrival, `P${pid} arrival`),
                databaseInteger(process.burst, `P${pid} burst`, 1),
                databaseInteger(process.berths ?? process.berthneeded ?? 0, `P${pid} berth request`),
                databaseInteger(process.cranes ?? process.craneneeded ?? 0, `P${pid} crane request`),
                databaseInteger(process.trucks ?? process.truckneeded ?? 0, `P${pid} truck request`),
            ];
        });
        if (requestRows.length) {
            await connection.query(
                `INSERT INTO ship_requests
                    (simulation_id, pid, ship_id, priority, arrival, burst, berth_count, crane_count, truck_count)
                 VALUES ${requestRows.map(() => "(?, ?, ?, ?, ?, ?, ?, ?, ?)").join(", ")}`,
                requestRows.flat()
            );
        }
        await connection.commit();
        return true;
    } catch (error) {
        await connection.rollback();
        throw error;
    }
}

// Read legacy records and migrate only those not previously copied.
async function main() {
    const connection = await mysql.createConnection({
        host: process.env.db_host,
        user: process.env.db_user,
        password: process.env.db_password || "",
        database: process.env.db_name,
    });

    try {
        await ensureLegacyIdColumn(connection);
        const [legacyRows] = await connection.query(
            "SELECT simulation_id, name, configuration, created_at FROM saved_simulations ORDER BY simulation_id"
        );
        let migrated = 0;
        for (const legacySimulation of legacyRows) {
            if (await migrateSimulation(connection, legacySimulation)) migrated += 1;
        }
        console.log(`Migrated ${migrated} legacy simulation(s); ${legacyRows.length - migrated} already migrated.`);
    } finally {
        await connection.end();
    }
}

main().catch((error) => {
    console.error("Could not migrate legacy simulations:", error.message);
    process.exitCode = 1;
});
