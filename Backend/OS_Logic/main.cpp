
#include <iostream>
#include <vector>
#include <string>
#include <iomanip>
#include <fstream>
#include <sstream>
#include <cmath>

using namespace std;

// classes
class Ship
{
public:
    int ship_id;
    string name;
    string type;
    string Country;
    string captain_name;
};

class Berth
{
public:
    int id;
    enum class size
    {
        Medium,
        Small,
        Large
    };
    size resourceSize;
    int duration;
    int timeleft;
    int status;
};

class Truck
{
public:
    int id;
    enum class size
    {
        Large,
        small
    };
    size resourceSize;
    int duration;
    int timeleft;
    int status;
};

class Crane
{
public:
    int id;
    enum class size
    {
        Large,
        small
    };
    size resourceSize;
    int duration;
    int timeleft;
    int status;
};

/* Process (one ship request)
Resources are numbered:  0 = berth, 1 = crane, 2 = truck
 needed[r] = how many units of that resource the ship needs       */
const int NOT_ARRIVED = 0;
const int WAITING = 1;
const int RUNNING = 2;
const int DONE = 3;

class Process
{
public:
    int pid;
    int ship_id;
    int priority;          // 1 = most important
    int effectivePriority; // changes because of aging
    int arrival;
    int burst; // how many seconds the ship stays and works
    int timeleft;
    int maximum[3];
    int allocation[3];
    int need[3];
    int needed[3]; // Legacy single request, kept for scheduling compatibility
    int state;
    int waited; // seconds waited (used for aging)
    int start;
    int finish;
    vector<int> allocatedBerths;
    vector<int> allocatedCranes;
    vector<int> allocatedTrucks;
};

/*global data */
int total[3] = {3, 2, 3}; // port has 3 berths, 2 cranes, 3 trucks
int available[3];         // free right now
string resName[3] = {"BERTH", "CRANE", "TRUCK"};
vector<Ship> ships;

// Individual hardcoded resources. status: 0 = FREE, 1 = IN USE
const int FREE = 0;
const int IN_USE = 1;
vector<Berth> berths;
vector<Crane> cranes;
vector<Truck> trucks;

void initializeResources()
{
    for (auto &berth : berths)
    {
        berth.duration = 0;
        berth.timeleft = 0;
        berth.status = FREE;
    }
    for (auto &crane : cranes)
    {
        crane.duration = 0;
        crane.timeleft = 0;
        crane.status = FREE;
    }
    for (auto &truck : trucks)
    {
        truck.duration = 0;
        truck.timeleft = 0;
        truck.status = FREE;
    }
}

string resourceStatus(int status)
{
    return status == FREE ? "FREE" : "IN USE";
}
string berthSizeName(Berth::size value)
{
    if (value == Berth::size::Medium)
        return "Medium";
    if (value == Berth::size::Small)
        return "Small";
    if (value == Berth::size::Large)
        return "Large";

    return "Unknown";
}

string truckSizeName(Truck::size value)
{
    if (value == Truck::size::Large)
        return "Large";
    if (value == Truck::size::small)
        return "Small";

    return "Unknown";
}

string craneSizeName(Crane::size value)
{
    if (value == Crane::size::Large)
        return "Large";
    if (value == Crane::size::small)
        return "Small";

    return "Unknown";
}

void printResources()
{
    cout << "\n--- INDIVIDUAL RESOURCE STATUS ---\n";

    cout << "\nBERTHS\n";
    cout << "ID\tSize\tDuration\tTimeleft\tStatus\n";

    for (const auto &b : berths)
        cout << b.id << "\t" << berthSizeName(b.resourceSize) << "\t" << b.duration << "\t\t" << b.timeleft << "\t\t" << resourceStatus(b.status) << "\n";
    cout << "\nCRANES\n";
    cout << "ID\tSize\tDuration\tTimeleft\tStatus\n";

    for (const auto &c : cranes)
        cout << c.id << "\t" << craneSizeName(c.resourceSize) << "\t" << c.duration << "\t\t" << c.timeleft << "\t\t" << resourceStatus(c.status) << "\n";

    cout << "\nTRUCKS\n";
    cout << "ID\tSize\tDuration\tTimeleft\tStatus\n";

    for (const auto &tr : trucks)
        cout << tr.id << "\t" << truckSizeName(tr.resourceSize) << "\t" << tr.duration << "\t\t" << tr.timeleft << "\t\t" << resourceStatus(tr.status) << "\n";

    cout << "\nFree counts: Berths=" << available[0] << ", Cranes=" << available[1] << ", Trucks=" << available[2] << "\n";
}

template <typename Resource>
void allocateResources(vector<Resource> &resources, int amount, int burst, vector<int> &allocatedIds)
{
    for (auto &resource : resources)
    {
        if (amount == 0)
            break;
        if (resource.status == FREE)
        {
            resource.status = IN_USE;
            resource.duration = burst;
            resource.timeleft = burst;
            allocatedIds.push_back(resource.id);
            amount--;
        }
    }
}

template <typename Resource>
void releaseResources(vector<Resource> &resources, const vector<int> &allocatedIds)
{
    for (auto &resource : resources)
    {
        for (int id : allocatedIds)
        {
            if (resource.id == id)
            {
                resource.status = FREE;
                resource.timeleft = 0;
            }
        }
    }
}

template <typename Resource>
void updateResourceTime(vector<Resource> &resources)
{
    for (auto &resource : resources)
        if (resource.status == IN_USE && resource.timeleft > 0)
            resource.timeleft--;
}

// File-loaded data
void addShip(int id, string name, string type, string country, string captain)
{
    Ship s;
    s.ship_id = id;
    s.name = name;
    s.type = type;
    s.Country = country;
    s.captain_name = captain;
    ships.push_back(s);
}

Process makeProcess(int pid, int ship, int prio, int arr, int burst, int b, int c, int t)
{
    Process p;
    p.pid = pid;
    p.ship_id = ship;
    p.priority = prio;
    p.effectivePriority = prio;
    p.arrival = arr;
    p.burst = burst;
    p.timeleft = burst;
    p.needed[0] = b;
    p.needed[1] = c;
    p.needed[2] = t;
    p.maximum[0] = b;
    p.maximum[1] = c;
    p.maximum[2] = t;
    p.allocation[0] = 0;
    p.allocation[1] = 0;
    p.allocation[2] = 0;
    p.need[0] = b;
    p.need[1] = c;
    p.need[2] = t;
    p.state = NOT_ARRIVED;
    p.waited = 0;
    p.start = -1;
    p.finish = -1;
    p.allocatedBerths.clear();
    p.allocatedCranes.clear();
    p.allocatedTrucks.clear();
    return p;
}

vector<Process> readfromfile()
{
    vector<Process> q;
    ships.clear();
    berths.clear();
    cranes.clear();
    trucks.clear();
    total[0] = total[1] = total[2] = 0;

    ifstream input("input.txt");
    if (!input.is_open())
    {
        cout << "ERROR: input.txt not found. Place it beside main.cpp or a.exe.\n";
        return q;
    }

    string line;
    while (getline(input, line))
    {
        if (line.empty() || line[0] == '#')
            continue;

        stringstream row(line);
        string keyword;
        row >> keyword;

        if (keyword == "BERTHS")
        {
            row >> total[0];
        }
        else if (keyword == "CRANES")
        {
            row >> total[1];
        }
        else if (keyword == "TRUCKS")
        {
            row >> total[2];
        }
        else if (keyword == "SHIP")
        {
            string pipeData;
            getline(row, pipeData);
            if (!pipeData.empty() && pipeData[0] == ' ')
                pipeData.erase(0, 1);

            stringstream fields(pipeData);
            string idText, name, type, country, captain;
            getline(fields, idText, '|');
            getline(fields, name, '|');
            getline(fields, type, '|');
            getline(fields, country, '|');
            getline(fields, captain, '|');
            addShip(stoi(idText), name, type, country, captain);
        }
        else if (keyword == "BERTH")
        {
            int id;
            string size;
            row >> id >> size;
            Berth::size parsedSize = Berth::size::Small;
            if (size == "Large" || size == "large")
                parsedSize = Berth::size::Large;
            else if (size == "Medium" || size == "medium")
                parsedSize = Berth::size::Medium;
            berths.push_back({id, parsedSize, 0, 0, FREE});
        }
        else if (keyword == "CRANE")
        {
            int id;
            string size;
            row >> id >> size;
            Crane::size parsedSize = (size == "Large" || size == "large") ? Crane::size::Large : Crane::size::small;
            cranes.push_back({id, parsedSize, 0, 0, FREE});
        }
        else if (keyword == "TRUCK")
        {
            int id;
            string size;
            row >> id >> size;
            Truck::size parsedSize = (size == "Large" || size == "large") ? Truck::size::Large : Truck::size::small;
            trucks.push_back({id, parsedSize, 0, 0, FREE});
        }
        else if (keyword == "PROCESS")
        {
            int pid, ship, priority, arrival, burst, b, c, t;
            if (row >> pid >> ship >> priority >> arrival >> burst >> b >> c >> t)
                q.push_back(makeProcess(pid, ship, priority, arrival, burst, b, c, t));
        }
    }

    if (berths.size() > 0)
        total[0] = berths.size();
    if (cranes.size() > 0)
        total[1] = cranes.size();
    if (trucks.size() > 0)
        total[2] = trucks.size();

    if (q.empty())
        cout << "ERROR: input.txt contains no PROCESS rows.\n";
    if (ships.empty())
        cout << "ERROR: input.txt contains no SHIP rows.\n";

    return q;
}

// small helper functions
string shipName(int id)
{
    int n = ships.size();
    for (int i = 0; i < n; i++)
    {
        if (ships[i].ship_id == id)
            return ships[i].name;
    }
    return "?";
}

void printName(Process &p)
{
    cout << "P" << p.pid << "(" << shipName(p.ship_id) << ")";
}

void printAvailable()
{
    cout << "B=" << available[0] << " C=" << available[1] << " T=" << available[2];
}

void printBankerTables(const vector<Process> &processes, const int work[3])
{
    cout << "\n--- BANKER'S TABLE: MAXIMUM / ALLOCATION / NEED ---\n";
    cout << left << setw(8) << "Process"
         << setw(10) << "Maximum"
         << setw(14) << "Allocation"
         << setw(12) << "Need"
         << "\n";

    for (const Process &p : processes)
    {
        cout << left << setw(8) << ("P" + to_string(p.pid));
        cout << setw(10) << (to_string(p.maximum[0]) + "/" + to_string(p.maximum[1]) + "/" + to_string(p.maximum[2]));
        cout << setw(14) << (to_string(p.allocation[0]) + "/" + to_string(p.allocation[1]) + "/" + to_string(p.allocation[2]));
        cout << setw(12) << (to_string(p.need[0]) + "/" + to_string(p.need[1]) + "/" + to_string(p.need[2])) << "\n";
    }

    cout << "Available after current allocations: "
         << work[0] << "/" << work[1] << "/" << work[2]
         << "  (Berth/Crane/Truck)\n";
}

bool isSafeState(vector<Process> &processes, vector<int> &safeSequence)
{
    int work[3] = {available[0], available[1], available[2]};
    vector<bool> finish(processes.size(), false);
    safeSequence.clear();

    for (int i = 0; i < (int)processes.size(); i++)
    {
        if (processes[i].state == NOT_ARRIVED || processes[i].state == DONE)
            finish[i] = true;
    }

    for (int step = 0; step < (int)processes.size(); step++)
    {
        bool found = false;

        for (int i = 0; i < (int)processes.size(); i++)
        {
            if (finish[i])
                continue;

            bool canFinish = true;
            for (int r = 0; r < 3; r++)
            {
                if (processes[i].need[r] > work[r])
                {
                    canFinish = false;
                    break;
                }
            }

            if (canFinish)
            {
                for (int r = 0; r < 3; r++)
                    work[r] += processes[i].allocation[r];
                finish[i] = true;
                safeSequence.push_back(processes[i].pid);
                found = true;
                break;
            }
        }

        if (!found)
        {
            for (int i = 0; i < (int)processes.size(); i++)
            {
                if (!finish[i])
                    return false;
            }
            return true;
        }
    }

    return true;
}

bool requestResources(Process &ship, int request[3])
{
    for (int r = 0; r < 3; r++)
    {
        if (request[r] > ship.need[r])
        {
            cout << "  BANKER: Request exceeds P" << ship.pid << " remaining NEED\n";
            return false;
        }
        if (request[r] > available[r])
            return false;
    }

    for (int r = 0; r < 3; r++)
    {
        available[r] -= request[r];
        ship.allocation[r] += request[r];
        ship.need[r] -= request[r];
    }

    return true;
}

bool requestIsSafe(vector<Process> &processes)
{
    vector<int> sequence;
    if (isSafeState(processes, sequence))
    {
        cout << "  BANKER: SAFE. Sequence: ";
        for (int pid : sequence)
            cout << "P" << pid << " ";
        cout << "\n";
        return true;
    }

    cout << "  BANKER: UNSAFE. Request denied to prevent deadlock\n";
    return false;
}

// SCHEDULING parT

// true if a should be served before b
// 1st rule: smaller priority number first (priority scheduling, with aging)
// 2nd rule: if priority is equal, the one who came first goes first (FCFS)
bool goesFirst(Process &a, Process &b)
{
    if (a.effectivePriority != b.effectivePriority)
    {
        return a.effectivePriority < b.effectivePriority;
    }
    if (a.arrival != b.arrival)
        return a.arrival < b.arrival;
    return a.pid < b.pid;
}

bool allDone(vector<Process> &ps)
{
    int n = ps.size();
    for (int i = 0; i < n; i++)
    {
        if (ps[i].state != DONE)
            return false;
    }
    return true;
}

void writeJsonString(ofstream &file, const string &text)
{
    file << "\"";
    for (char c : text)
    {
        if (c == '\\' || c == '\"')
            file << '\\' << c;
        else
            file << c;
    }
    file << "\"";
}

struct OutputProcessFrame
{
    int pid;
    string status;
    int remaining;
    int allocation[3];
    int need[3];
};

struct BankerEventFrame
{
    int time;
    int pid;
    int request[3];
    bool safe;
    vector<int> sequence;
};

struct OutputFrame
{
    int time;
    int availableBerths;
    int availableCranes;
    int availableTrucks;
    vector<OutputProcessFrame> processes;
};

vector<OutputFrame> outputTimeline;
vector<BankerEventFrame> bankerEvents;

void printResults(vector<Process> &ps, int t)
{
    cout << "\n------ RESULTS ------\n";
    cout << "PID\tShip\t\tArrive\tBurst\tStart\tFinish\tTAT\tWait\n";

    double sumTat = 0;
    double sumWait = 0;
    int n = ps.size();
    for (int i = 0; i < n; i++)
    {
        int tat = ps[i].finish - ps[i].arrival; // turnaround time
        int wait = tat - ps[i].burst;           // time spent waiting
        sumTat = sumTat + tat;
        sumWait = sumWait + wait;
        cout << "P" << ps[i].pid << "\t" << shipName(ps[i].ship_id) << "\t" << ps[i].arrival << "\t" << ps[i].burst << "\t" << ps[i].start << "\t" << ps[i].finish << "\t" << tat << "\t" << wait << "\n";
    }

    cout << "Average turnaround = " << sumTat / n << "   Average wait = " << sumWait / n << "   Finished at t = " << t << "\n";

    ofstream output("output.txt", ios::trunc);
    if (!output.is_open())
    {
        cout << "ERROR: Could not create output.txt\n";
        return;
    }

    output << fixed << setprecision(2);
    output << "{\n";
    output << "  \"timeline\": [\n";
    for (int i = 0; i < (int)outputTimeline.size(); i++)
    {
        const OutputFrame &frame = outputTimeline[i];
        output << "    {\"time\":" << frame.time << ",\"available\":["
               << frame.availableBerths << "," << frame.availableCranes << "," << frame.availableTrucks
               << "],\"processes\":[";
        for (int p = 0; p < (int)frame.processes.size(); p++)
        {
            const OutputProcessFrame &process = frame.processes[p];
            output << "{\"pid\":" << process.pid << ",\"status\":";
            writeJsonString(output, process.status);
            output << ",\"remaining\":" << process.remaining
                   << ",\"allocation\":[" << process.allocation[0] << "," << process.allocation[1] << "," << process.allocation[2]
                   << "],\"need\":[" << process.need[0] << "," << process.need[1] << "," << process.need[2] << "]}";
            if (p + 1 < (int)frame.processes.size())
                output << ",";
        }
        output << "]}";
        if (i + 1 < (int)outputTimeline.size())
            output << ",";
        output << "\n";
    }
    output << "  ],\n";
    output << "  \"bankerEvents\": [\n";
    for (int i = 0; i < (int)bankerEvents.size(); i++)
    {
        const BankerEventFrame &event = bankerEvents[i];
        output << "    {\"time\":" << event.time << ",\"pid\":" << event.pid
               << ",\"request\":[" << event.request[0] << "," << event.request[1] << "," << event.request[2]
               << "],\"safe\":" << (event.safe ? "true" : "false") << ",\"sequence\":[";
        for (int s = 0; s < (int)event.sequence.size(); s++)
        {
            if (s > 0)
                output << ",";
            output << event.sequence[s];
        }
        output << "]}";
        if (i + 1 < (int)bankerEvents.size())
            output << ",";
        output << "\n";
    }
    output << "  ],\n";
    output << "  \"finalMetrics\": {\n";
    output << "    \"averageTurnaround\": " << (sumTat / n) << ",\n";
    output << "    \"averageWait\": " << (sumWait / n) << ",\n";
    output << "    \"finishedAt\": " << t << "\n";
    output << "  },\n";
    output << "  \"results\": [\n";

    for (int i = 0; i < n; i++)
    {
        int tat = ps[i].finish - ps[i].arrival;
        int wait = tat - ps[i].burst;
        output << "    {\"pid\":" << ps[i].pid << ",\"ship\":";
        writeJsonString(output, shipName(ps[i].ship_id));
        output << ",\"start\":" << ps[i].start << ",\"finish\":" << ps[i].finish
               << ",\"turnaround\":" << tat << ",\"wait\":" << wait << "}";
        if (i + 1 < n)
            output << ",";
        output << "\n";
    }

    output << "  ],\n";
    output << "  \"port\": {\"total\":[" << total[0] << "," << total[1] << "," << total[2]
           << "],\"resourceNames\":[\"Berth\",\"Crane\",\"Truck\"]}\n";
    output << "}\n";
    output.close();
    cout << "File output written to output.txt\n";
}

// Priority scheduling + FCFS (for equal priority) + aging
void simulate(vector<Process> ps)
{
    outputTimeline.clear();
    bankerEvents.clear();

    int agingTime = 2; // every 2 seconds of waiting, priority improves
    for (int r = 0; r < 3; r++)
        available[r] = total[r];
    initializeResources();
    printResources();

    int n = ps.size();
    int t = 0;
    while (!allDone(ps) && t < 200)
    {
        cout << "\n[t=" << t << "] free: ";
        printAvailable();
        cout << "\n";
        int bankerAvailable[3] = {available[0], available[1], available[2]};
        printBankerTables(ps, bankerAvailable);

        // 1. ships that arrive now
        for (int i = 0; i < n; i++)
        {
            if (ps[i].state == NOT_ARRIVED && ps[i].arrival <= t)
            {
                ps[i].state = WAITING;
                cout << "  ARRIVE: ";
                printName(ps[i]);
                cout << " priority " << ps[i].priority << "\n";
            }
        }

        // 2. list the waiting ships and sort them (bubble sort)
        vector<int> order;
        for (int i = 0; i < n; i++)
        {
            if (ps[i].state == WAITING)
                order.push_back(i);
        }
        int count = order.size();

        for (int a = 0; a < count - 1; a++)
        {
            for (int b = 0; b < count - 1 - a; b++)
            {
                if (goesFirst(ps[order[b + 1]], ps[order[b]]))
                {
                    int temp = order[b];
                    order[b] = order[b + 1];
                    order[b + 1] = temp;
                }
            }
        }

        // 3. Each waiting process submits one unit of each needed resource type.
        // Banker may grant or reject each partial request.
        for (int k = 0; k < count; k++)
        {
            int i = order[k];
            int request[3] = {0, 0, 0};

            for (int r = 0; r < 3; r++)
            {
                if (ps[i].need[r] > 0 && available[r] > 0)
                    request[r] = 1;
            }

            if (request[0] == 0 && request[1] == 0 && request[2] == 0)
            {
                cout << "  WAIT  : ";
                printName(ps[i]);
                cout << " no safe resource units are currently available\n";
                continue;
            }

            cout << "  BANKER: ";
            printName(ps[i]);
            cout << " requests B=" << request[0] << " C=" << request[1]
                 << " T=" << request[2] << "\n";

            if (!requestResources(ps[i], request))
            {
                cout << "  BANKER: Request denied by availability checks\n";
                continue;
            }

            vector<int> safeSequence;
            bool safe = isSafeState(ps, safeSequence);
            bankerEvents.push_back({t, ps[i].pid, {request[0], request[1], request[2]}, safe, safeSequence});

            if (!safe)
            {
                for (int r = 0; r < 3; r++)
                {
                    available[r] += request[r];
                    ps[i].allocation[r] -= request[r];
                    ps[i].need[r] += request[r];
                }
                continue;
            }

            allocateResources(berths, request[0], ps[i].burst, ps[i].allocatedBerths);
            allocateResources(cranes, request[1], ps[i].burst, ps[i].allocatedCranes);
            allocateResources(trucks, request[2], ps[i].burst, ps[i].allocatedTrucks);
            ps[i].needed[0] = ps[i].need[0];
            ps[i].needed[1] = ps[i].need[1];
            ps[i].needed[2] = ps[i].need[2];

            cout << "  GRANT : ";
            printName(ps[i]);
            cout << " receives B=" << request[0] << " C=" << request[1]
                 << " T=" << request[2]
                 << "; allocation now B=" << ps[i].allocation[0]
                 << " C=" << ps[i].allocation[1]
                 << " T=" << ps[i].allocation[2] << "\n";

            bool maximumReached = true;
            for (int r = 0; r < 3; r++)
            {
                if (ps[i].allocation[r] != ps[i].maximum[r])
                    maximumReached = false;
            }

            if (maximumReached && ps[i].state == WAITING)
            {
                ps[i].state = RUNNING;
                ps[i].start = t;
                ps[i].timeleft = ps[i].burst;
                cout << "  START : ";
                printName(ps[i]);
                cout << " has received its maximum resources and starts\n";
            }
        }

        printResources();
        // 4. running ships work for one second
        for (int i = 0; i < n; i++)
        {
            if (ps[i].state == RUNNING)
            {
                ps[i].timeleft--;
                if (ps[i].timeleft == 0)
                {
                    ps[i].state = DONE;
                    ps[i].finish = t + 1;
                    for (int r = 0; r < 3; r++)
                    {
                        available[r] = available[r] + ps[i].allocation[r];
                        ps[i].allocation[r] = 0;
                        ps[i].need[r] = 0;
                        ps[i].needed[r] = 0;
                    }
                    releaseResources(berths, ps[i].allocatedBerths);
                    releaseResources(cranes, ps[i].allocatedCranes);
                    releaseResources(trucks, ps[i].allocatedTrucks);
                    cout << "  DONE  : ";
                    printName(ps[i]);
                    cout << " finished at t=" << ps[i].finish << ", resources given back\n";
                }
            }
        }
        // Update remaining time for each resource currently in use.
        updateResourceTime(berths);
        updateResourceTime(cranes);
        updateResourceTime(trucks);

        // 5. aging: the longer a ship waits, the more important it becomes
        for (int i = 0; i < n; i++)
        {
            if (ps[i].state == WAITING)
            {
                ps[i].waited++;
                if (ps[i].waited % agingTime == 0 && ps[i].effectivePriority > 1)
                {
                    cout << "  AGING : ";
                    printName(ps[i]);
                    cout << " waited " << ps[i].waited << "s, priority " << ps[i].effectivePriority << " -> " << ps[i].effectivePriority - 1 << "\n";
                    ps[i].effectivePriority--;
                }
            }
        }

        OutputFrame frame;
        frame.time = t;
        frame.availableBerths = available[0];
        frame.availableCranes = available[1];
        frame.availableTrucks = available[2];
        for (int i = 0; i < n; i++)
        {
            string status = "Not arrived";
            if (ps[i].state == WAITING)
                status = "Waiting";
            else if (ps[i].state == RUNNING)
                status = "Running";
            else if (ps[i].state == DONE)
                status = "Done";
            OutputProcessFrame processFrame;
            processFrame.pid = ps[i].pid;
            processFrame.status = status;
            processFrame.remaining = ps[i].state == RUNNING ? ps[i].timeleft : -1;
            for (int r = 0; r < 3; r++)
            {
                processFrame.allocation[r] = ps[i].allocation[r];
                processFrame.need[r] = ps[i].need[r];
            }
            frame.processes.push_back(processFrame);
        }
        outputTimeline.push_back(frame);
        t++;
    }
    printResources();
    printResults(ps, t);
}

// main
int main()
{
    vector<Process> Port_Queue;
    Port_Queue = readfromfile();

    cout << "PORT RESOURCE MANAGER\n";
    cout << "Port has: " << total[0] << " berths, " << total[1] << " cranes, "
         << total[2] << " trucks\n";
    cout << "Scheduling: Priority + FCFS (tie-break) + Aging\n";

    if (Port_Queue.empty())
    {
        cout << "ERROR: No valid PROCESS rows were read from input.txt\n";
        return 1;
    }

    // Validate both ship references and port capacity from input.txt.
    int count = Port_Queue.size();
    for (int i = 0; i < count; i++)
    {
        bool shipExists = false;
        for (const Ship &ship : ships)
        {
            if (ship.ship_id == Port_Queue[i].ship_id)
            {
                shipExists = true;
                break;
            }
        }
        if (!shipExists)
        {
            cout << "ERROR: P" << Port_Queue[i].pid << " references unknown ship ID "
                 << Port_Queue[i].ship_id << "\n";
            return 1;
        }

        for (int r = 0; r < 3; r++)
        {
            if (Port_Queue[i].needed[r] > total[r])
            {
                cout << "ERROR: P" << Port_Queue[i].pid << " needs more " << resName[r]
                     << " than the port has\n";
                return 1;
            }
        }
    }

    simulate(Port_Queue);
    return 0;
}