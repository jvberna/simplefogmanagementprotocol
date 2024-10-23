


// Let's save the last 60 seconds.
const longMeter = 10;
// Unit of measurement, 1 sec = 1000 ms
const unitMeter = 1000;

const toUnitMeter = (number) => {
    return Math.round(number / unitMeter)
}

// Reads the date on which the object is started
var iniTime = toUnitMeter(new Date().getTime());

// List with measurements taken each unitMeter and length maximum lengthMeter
var metersArray = Array(longMeter).fill(0);
const totalMeters = () => {
    const res = metersArray.reduce((acc, current) => acc + current, 0);
    return res;
} 

// Let's add 1 to the count
const addMessage = () => {
    //we take the current time and subtract the initial time from the one we are measuring 
    // this would give us the position in the array of matersArray where it has to be summed up
    const now = toUnitMeter(new Date().getTime());
    var seconds = now - iniTime + 1;
    // If the current position of meters is smaller than the position where it should be added 
    // we lengthen the meters
    if (seconds > longMeter) {
        //How many more positions to add, position minus length
        var i = seconds - longMeter;
        // if more than longMeters are to be added, we create a new array all of 0
        if (i > longMeter) {
            metersArray = Array(longMeter).fill(0);
            // let's add in the last position
        } else {
            // add as many elements behind as necessary
            const add = Array(i).fill(0);
            metersArray = metersArray.concat(add);
            //console.log('-Concateno i elementos ', add, ' a 0: ', metersArray)
            // eliminalos los mismos elementos del principio
            metersArray.splice(0, i)

        }
        seconds = longMeter;
        iniTime = now - seconds;
    }
    metersArray[seconds - 1]++;

}


module.exports = { addMessage, totalMeters }