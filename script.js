console.log("SCRIPT STARTED");

const supabase = createClient(
    "https://pqojvxbteermfwoeejtq.supabase.co",
    "sb_publishable_DBXZI8UOQQr1kxdZgSskxg_z0qd9jD-"
);


// ===============================
// Stopwatch variables
// ===============================
let currentUser = null;
async function checkUser(){

    const {data} =
        await supabase.auth.getUser();

    currentUser =
        data.user;

    console.log(currentUser);

}

checkUser();



let running = false;
let startTime = 0;
let elapsedTime = 0;
let lastLapTime = 0;
let animationFrame;

let laps = [];




// ===============================
// DOM references
// ===============================
const mainTimer =
    document.getElementById("mainTimer");
const startStopButton =
    document.getElementById("startStopButton");
const lapResetButton =
    document.getElementById("lapResetButton");
const lapList =
    document.getElementById("lapList");
const resetModal =
    document.getElementById("resetModal");
const cancelResetButton =
    document.getElementById("cancelResetButton");
const confirmResetButton =
    document.getElementById("confirmResetButton");




// ===============================
// Time formatting
// ===============================
function formatTime(milliseconds, hundredths=false){
    let totalSeconds =
        Math.floor(milliseconds / 1000);
    let hours =
        Math.floor(totalSeconds / 3600);
    let minutes =
        Math.floor((totalSeconds % 3600)/60);
    let seconds =
        totalSeconds % 60;

    let result;
    if(hours === 0){
        result = 
            `${String(minutes).padStart(2, "0")}:` +
            `${String(seconds).padStart(2, "0")}`;
    }
    else{
        result = 
            `${String(hours).padStart(2, "0")}:` +
            `${String(minutes).padStart(2, "0")}:` +
            `${String(seconds).padStart(2, "0")}`;
    }

    if(hundredths){
        let ms =
            Math.floor((milliseconds % 1000) / 10);
        result +=
            "." + String(ms).padStart(2,"0");
    }

    return result;
}





// ===============================
// Timer update
// ===============================
function updateTimer(){
    if(running){
        elapsedTime =
            performance.now() - startTime;
        mainTimer.textContent =
            formatTime(elapsedTime);
        animationFrame =
            requestAnimationFrame(updateTimer);
    }
}




// ===============================
// Start / Stop
// ===============================
let sessionStart = null;

function startTimer(){
    running=true;
    startTime =
        performance.now() - elapsedTime;
    updateTimer();
    startStopButton.textContent="Stop";
    lapResetButton.textContent="Lap";

    sessionStart = new Date();
}





function stopTimer(){
    running=false;
    cancelAnimationFrame(animationFrame);
    startStopButton.textContent="Start";
    lapResetButton.textContent="Reset";
}



startStopButton.onclick=function(){
    if(running){
        stopTimer();
    }
    else{
        startTimer();
    }
};






// ===============================
// Lap function
// ===============================
async function recordLap(){
    let lapDuration = elapsedTime - lastLapTime;

    lastLapTime = elapsedTime;

    const lap = {
        user_id:
        currentUser.id,

        name:
        `Lap ${laps.length+1}`,

        duration:
        lapDuration,

        start_time:
        sessionStart,

        end_time:
        new Date()
    };

    const {error} = 
        await supabase
        .from("laps")
        .insert(lap);

    if(error){
        console.error(
            "Saving lap failed:",
            error
        );

        return;
    }

    laps.unshift(lap);

    renderLaps();
}






lapResetButton.onclick=function(){
    if(running){
        recordLap();
    }
    else{
        openResetModal();
    }
};






// ===============================
// Render laps
// ===============================
function renderLaps(){
    lapList.innerHTML="";
    laps.forEach((lap,index)=>{
        let item =
        document.createElement("div");
        item.className="lap-item";
        let name =
        document.createElement("span");

        name.className="lap-name";
        name.textContent =
        lap.name;

        let time =
        document.createElement("span");
        time.className="lap-time";
        time.textContent =
        formatTime(
            lap.duration,
            true
        );

        enableEditing(name,lap);
        item.appendChild(name);
        item.appendChild(time);

        lapList.appendChild(item);
    });
}




async function loadLaps(){

    const {data,error} =
        await supabase
        .from("laps")
        .select("*")
        .order(
            "created_at",
            {ascending:false}
        );


    if(error){

        console.error(error);
        return;

    }


    laps=data;

    renderLaps();

}



// ===============================
// Name editing
// ===============================
function enableEditing(element,lap){
    element.ondblclick=function(){
        let input =
        document.createElement("input");

        input.value =
        lap.name;

        input.className=
        "lap-name-input";

        element.replaceWith(input);
        input.focus();

    async function save(){

        const newName =
            input.value || lap.name;


        lap.name =
            newName;


        const { error } =
            await supabase
            .from("laps")
            .update({
                name: newName
            })
            .eq(
                "id",
                lap.id
            );


        if(error){

            console.error(
                "Updating name failed:",
                error
            );

            return;

    }


    renderLaps();

}

        input.onkeydown=function(e){
            if(e.key==="Enter"){

                save();
            }
        };
        input.onblur=save;
    };
}



// ===============================
// Reset system
// ===============================
function openResetModal(){
    resetModal.classList.remove("hidden");
}

function closeResetModal(){
    resetModal.classList.add("hidden");
}


cancelResetButton.onclick=
closeResetModal;


confirmResetButton.onclick = async function(){

    const { error } =
        await supabase
        .from("laps")
        .delete()
        .eq(
            "user_id",
            currentUser.id
        );


    if(error){

        console.error(
            "Deleting laps failed:",
            error
        );

        return;

    }


    elapsedTime=0;

    lastLapTime=0;

    laps=[];


    mainTimer.textContent =
    "00:00:00";


    lapList.innerHTML =
    "";


    closeResetModal();

};



// ===============================
// Keyboard shortcuts
// ===============================
document.addEventListener(
"keydown",
function(e){
    if(e.code==="Space"){
        e.preventDefault();
        startStopButton.click();
    }
    if(e.key.toLowerCase()==="l"
       && running){
        recordLap();
    }
    if(e.key==="Escape"){

        closeResetModal();
    }
});




async function testConnection(){

    const {data,error} =
        await supabase
        .from("laps")
        .select("*");


    console.log("Data:", data);

    console.log("Error:", error);

}


testConnection();
