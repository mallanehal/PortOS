/* Remaining topics  :
1. Banker's Algorithm
2. File handling
*/

#include <iostream>
#include <vector>
#include <string>
#include <iomanip>
using namespace std;

//classes
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
    int needed[3];
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
    berths = {
        {101, Berth::size::Large, 0, 0, FREE},
        {102, Berth::size::Medium, 0, 0, FREE},
        {103, Berth::size::Small, 0, 0, FREE}};
    cranes = {
        {201, Crane::size::Large, 0, 0, FREE},
        {202, Crane::size::small, 0, 0, FREE}};
    trucks = {
        {301, Truck::size::Large, 0, 0, FREE},
        {302, Truck::size::small, 0, 0, FREE},
        {303, Truck::size::small, 0, 0, FREE}};
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

//hardcoded data
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
    addShip(1, "MV Aurora", "Cargo", "Norway", "Erik Hansen");
    addShip(2, "Ever Dawn", "Container", "Taiwan", "Li Wei");
    addShip(3, "Blue Marlin", "Tanker", "Panama", "R. Diaz");
    addShip(4, "Sea Queen", "Passenger", "Italy", "M. Rossi");

    // format :  pid ship prio arr burst  B  C  T
    q.push_back(makeProcess(1, 1, 2, 1, 4, 1, 1, 0));
    q.push_back(makeProcess(2, 2, 2, 0, 4, 2, 1, 3));
    q.push_back(makeProcess(3, 3, 3, 4, 3, 2, 0, 0));
    q.push_back(makeProcess(4, 4, 5, 0, 2, 1, 0, 3));
    q.push_back(makeProcess(5, 1, 1, 1, 3, 1, 1, 3));
    q.push_back(makeProcess(6, 2, 1, 1, 2, 1, 2, 2));
    return q;
}

//small helper functions
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

// true if everything the ship needs is free right now
bool canStart(Process &p)
{
    for (int r = 0; r < 3; r++)
    {
        if (p.needed[r] > available[r])
            return false;
    }
    return true;
}

//SCHEDULING parT

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
}

// Priority scheduling + FCFS (for equal priority) + aging
void simulate(vector<Process> ps)
{
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
        int order[20];
        int count = 0;
        for (int i = 0; i < n; i++)
        {
            if (ps[i].state == WAITING)
            {
                order[count] = i;
                count++;
            }
        }
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

        // 3. go through the queue in order: a ship starts only if it can get EVERYTHING it needs
        for (int k = 0; k < count; k++)
        {
            int i = order[k];

            if (canStart(ps[i]))
            {
                for (int r = 0; r < 3; r++)
                    available[r] = available[r] - ps[i].needed[r];
                allocateResources(berths, ps[i].needed[0], ps[i].burst, ps[i].allocatedBerths);
                allocateResources(cranes, ps[i].needed[1], ps[i].burst, ps[i].allocatedCranes);
                allocateResources(trucks, ps[i].needed[2], ps[i].burst, ps[i].allocatedTrucks);
                ps[i].state = RUNNING;
                ps[i].start = t;
                ps[i].timeleft = ps[i].burst;
                cout << "  START : ";
                printName(ps[i]);
                cout << " gets B=" << ps[i].needed[0] << " C=" << ps[i].needed[1] << " T=" << ps[i].needed[2] << ", works for " << ps[i].burst << "s\n";
            }
            else
            {
                cout << "  WAIT  : ";
                printName(ps[i]);
                cout << " (priority " << ps[i].effectivePriority << ") not enough:";
                for (int r = 0; r < 3; r++)
                {
                    if (ps[i].needed[r] > available[r])
                    {
                        cout << " " << resName[r] << "(needs " << ps[i].needed[r]
                             << ", free " << available[r] << ")";
                    }
                }
                cout << "\n";
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
                        available[r] = available[r] + ps[i].needed[r];
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

        t++;
    }
    printResources();
    printResults(ps, t);
}

//main
int main()
{
    

    vector<Process> Port_Queue;
    Port_Queue = readfromfile();

    cout << "PORT RESOURCE MANAGER\n";
    cout << "Port has: " << total[0] << " berths, " << total[1] << " cranes, "
         << total[2] << " trucks\n";
    cout << "Scheduling: Priority + FCFS (tie-break) + Aging\n";

    // a ship that needs more than the whole port owns could never start
    int count = Port_Queue.size();
    for (int i = 0; i < count; i++)
    {
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