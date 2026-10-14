#include<iostream>
#include<bits/stdc++.h>
using namespace std;
class Ship{

    public:
  int ship_id;
  string name;
  string type;
  string Country;
  string captain_name;

};
class Berth{
    public:
    enum class size{
        Medium,
        Small,
        Large

    };
    int duration;
    int timeleft;
    int status;
    
};
class Truck{
    public:
    enum class size{
        Large,
        small
    };
    int duration;
    int timeleft;
    int status;
};
class Crane{
    public:
    enum class size{
        Large,
        small
    };
    int duration;
    int timeleft;
    int status;
};

class Process{
    int pid;
    int priority;
    int berthneeded;
    int berthremaining;
    int truckneeded;
    int truckremaining;
    int craneremaining;
    int craneneeded;


};

vector<Process> readfromfile(){
    
vector<Process>q;
return q;


}


int main(){
    vector<Process>Port_Queue;
  Port_Queue=readfromfile();



    


}