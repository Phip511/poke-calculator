// Hello world program
// console.log('Hello World');

// let name = 'Mosh';
// console.log(name);
// cannot be a reserved keyword (if, else, etc.)
// Names should be meaningful
// Names cannot start with a number
// Names cannot contain a space or hyphen
// Case sensitive
//EX
// let firstName='';
// let lastName='';

/*
// use consts if you dont want to deal w code
const interestRate = 0.3;
interestRate = 1;
console.log(interestRate);
*/

/*
let name = 'Mosh'; // string literal
let age = 30; // number literal
let isApproved = false; // boolean literal
let firstName = undefined;
let lastName = null; // use null when you explicitly want to clear a value
*/

/*
// OOP: define w 'let name = {data};'
let person = {
    name: 'Mosh',
    age: 30
};

// Dot Notation
person.name = 'John';

// Bracket Notation
person['name'] = 'Mary'

console.log(person.name);
*/

/*
// Arrays
let selectedColors = ['red','blue'];
selectedColors[2] = 'green'; // dynamic allocation of entries (length extends)
selectedColors[3] = 1; // dynamic typing
console.log(selectedColors); // displays entire arary
console.log(selectedColors[0]); // displays entry 0
console.log(selectedColors[2]);
*/

/*
//functions    //parameter (input), seperate entries w commas
function greet(name) {
    console.log('Hello ' + name);
}

greet('John'); // John is an argument to the greet function
*/

// functions continued
// previous function performs a task

// Calculating a value
/*
function square(number) {
    return number * number;
}
*/
// basis for all stat value functions, copy with ids
// once api is running, edit add functions with new values
function getValHP(){
    return Number(document.getElementById("hp").innerHTML);
}
function addHP(){
    x = getValHP() + 1;
    document.getElementById("hp").innerHTML = x;
}
//attack
function getValATK(){
    return Number(document.getElementById("atk").innerHTML);
}
function addATK(){
    x = getValATK() + 1;
    document.getElementById("atk").innerHTML = x;
}
//special attack
function getValSPA(){
    return Number(document.getElementById("spa").innerHTML);
}
function addSPA(){
    x = getValSPA() + 1;
    document.getElementById("spa").innerHTML = x;
}
//defense
function getValDEF(){
    return Number(document.getElementById("def").innerHTML);
}
function addDEF(){
    x = getValDEF() + 1;
    document.getElementById("def").innerHTML = x;
}
//special defense
function getValSPD(){
    return Number(document.getElementById("spd").innerHTML);
}
function addSPD(){
    x = getValSPD() + 1;
    document.getElementById("spd").innerHTML = x;
}
//speed
function getValSPE(){
    return Number(document.getElementById("spe").innerHTML);
}
function addSPE(){
    x = getValSPE() + 1;
    document.getElementById("spe").innerHTML = x;
}

function add1All(){ // test function
    addHP();
    addATK();
    addSPA();
    addDEF();
    addSPD();
    addSPE();
}

function button(){
    add1All();
    //hp=getValHP,atk=getValATK,spa=getValSPA,def=getValDEF,spd=getValSPD,spe=getValSPE;
    console.log(getValHP());
    upperBoundCheck()
}

function upperBoundCheck(){
    n = 5 //upper bound variable
    stop = "upper bound reached; stop here"
    if(getValHP() >= n | getValATK() >= n | getValDEF() >= n | getValSPA() >= n | getValSPD() >= n | getValSPE() >= n) { // change value to 252 later
        document.getElementById("checker").innerHTML = stop

    }
}