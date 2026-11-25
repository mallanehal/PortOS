# PortOS database setup

The React app uses the existing C++ simulation endpoint for running a simulation. This folder contains a separate Express API that stores and retrieves saved configurations from MySQL.

## One-time setup

1. Install and start MySQL Server, then connect to it in MySQL Workbench.
2. Open `schema.sql` in Workbench and execute it. It creates the `portos` database and normalized `simulations`, `ships`, `resources`, and `ship_requests` tables. If you already ran the earlier JSON-only schema, execute this updated script too; it adds the relational tables and leaves the old `saved_simulations` table and its rows intact.
3. Copy `.env.example` to `.env` in this folder. Set `db_host`, `db_user`, `db_password`, and `db_name` to match your MySQL installation. The database name in the example is `portos`.

Keep `.env` private; it is ignored by Git.

If you already have rows in the old JSON-based `saved_simulations` table, run `npm run migrate:legacy` once from this folder after configuring `.env`. It copies them into the relational tables without removing the originals; it is safe to run again.

## Start the app

Open two terminals from the project folder.

**Terminal 1 — database API**

```powershell
cd database_connectivity
npm install
npm start
```

The API listens on `http://localhost:3000`.

**Terminal 2 — frontend**

```powershell
cd Frontend
npm install
npm run dev
```

Open the Vite URL shown in the terminal. In the setup page, enter a simulation name and choose **Save configuration** to store its simulation row, ships, resources, and ship requests in related MySQL tables using a transaction. Use **Load and run** beside a saved simulation to retrieve its configuration through relational queries and run it again. Choose **Delete** and confirm to permanently remove a saved simulation and its related data. **Run simulation** alone does not save the setup.

The relationships are: each simulation has many ships and resources; each ship request belongs to one simulation and refers to a ship in that simulation. Deleting a simulation deletes its related rows through foreign-key cascades.

To inspect the stored data in Workbench, select the `portos` schema and run:

```sql
SELECT simulation_id, name, created_at FROM simulations;

SELECT sh.source_ship_id AS ship_id, sh.name, sr.pid, sr.priority,
       sr.arrival, sr.burst, sr.berth_count, sr.crane_count, sr.truck_count
FROM ships sh
LEFT JOIN ship_requests sr
  ON sr.simulation_id = sh.simulation_id AND sr.ship_id = sh.ship_id
WHERE sh.simulation_id = 1;

SELECT resource_type, resource_number, size
FROM resources
WHERE simulation_id = 1;
```

The frontend proxies saved-simulation requests to the database API; simulation runs continue through the existing C++ backend. If the saved-simulations section shows an error, verify that MySQL is running, `.env` has the right credentials, and `schema.sql` was executed, then refresh the list.


## Crane MLP risk assessment (demo integration)

1. Apply `schema.sql` for a new database, or run `migration_crane_ai.sql` against the existing `portos` database.
2. Start the Python service by following `../Backend/AI_Module/README.md`. It trains/loads an MLP on synthetic demo records.
3. Start the Node API with `npm start` from this folder.
4. Start the Vite frontend. Under each crane in **1. Port resources**, choose **Assess crane risk with MLP**.

Predictions are persisted in `crane_ai_predictions`. The model is synthetic-demo-only and is not suitable for real crane safety decisions.
