let inviteList = []

async function retrieveWorkout() {  
    let workoutData = null;
    let form = document.querySelector("#form-workout");
    let formData = new FormData(form);

    for (let key of formData.keys()) {
        let selector = `input[name="${key}"], textarea[name="${key}"]`;
        let input = form.querySelector(selector);
        let newVal = workoutData[key];
        if (key == "date") {
            // Creating a valid datetime-local string with the correct local time
            let date = new Date(newVal);
            date = new Date(date.getTime() - (date.getTimezoneOffset() * 60 * 1000)).toISOString(); // get ISO format for local time
            newVal = date.substring(0, newVal.length - 1);    // remove Z (since this is a local time, not UTC)
        }
        if (key != "files") {
            input.value = newVal;
        }
    }

    let input = form.querySelector("select:disabled");
    input.value = workoutData["visibility"];
    // files
    let filesDiv = document.querySelector("#uploaded-files");
    for (let file of workoutData.files) {
        let a = document.createElement("a");
        a.href = file.file;
        let pathArray = file.file.split("/");
        a.text = pathArray[pathArray.length - 1];
        a.className = "me-2";
        filesDiv.appendChild(a);
    }
    return workoutData;     
}

async function displayInviteList() {
    let user = await getCurrentUser();
    let emptyAthleteInviteList = document.querySelector("#athlete-invite-list")
    let templateAthleteSelector = document.querySelector("#athlete-selector-template")
    for (let athleteUrl of user.athletes) {
        let response = await sendRequest("GET", athleteUrl);
        let athlete = await response.json();
        let currentAthleteSelector = document.querySelector(`#athlete-selector-${athlete.username}`)
        if (!currentAthleteSelector) {
            athleteSelector = createAthleteSelector(athlete, templateAthleteSelector, emptyAthleteInviteList);
        }
    }
}

function selectDeselect(a) {
    let athleteSelector = document.querySelector("#" + a.id)
    if (athleteSelector.classList.contains('active')) {
        athleteSelector.classList.remove("active");
        inviteList.splice(inviteList.indexOf(a.text), 1)
    } else {
        athleteSelector.classList.add("active");
        inviteList.push(a.text)
    }
    console.log(inviteList)
}

function createAthleteSelector(athlete, templateAthleteSelector, emptyAthleteInviteList) {
    let cloneAthleteSelector = templateAthleteSelector.content.cloneNode(true);
    let a = cloneAthleteSelector.querySelector("a");
    a.id = `athlete-selector-${athlete.username}`;
    a.text = athlete.username;
    a.addEventListener("click", () => selectDeselect(a))
    emptyAthleteInviteList.appendChild(a)
}

function generateWorkoutForm() {
    let form = document.querySelector("#form-workout");

    let formData = new FormData(form);
    let submitForm = new FormData();

    submitForm.append("name", formData.get('name'));
    let date = new Date(formData.get('date')).toISOString();
    submitForm.append("date", date);
    submitForm.append("notes", formData.get("notes"));
    submitForm.append("visibility", "LT");
    submitForm.append("athletes", inviteList)
    submitForm.append("exercise_instances", "[]");
    
    return submitForm;
}

async function createWorkout() {
    let submitForm = generateWorkoutForm();

    let response = await sendRequest("POST", `${HOST}/api/workouts/`, submitForm, "");
    if (response.ok) {
        let data = await response.json()
        let workoutId = data.id
        window.location.replace(`workout.html?id=${workoutId}`)
    } else {
        let data = await response.json();
        let alert = createAlert("Could not create new workout!", data);
        document.body.prepend(alert);
    }
}

function handleCancelDuringWorkoutCreate() {
    window.location.replace("myathletes.html");
}


window.addEventListener("DOMContentLoaded", async () => {
    let cancelWorkoutButton = document.querySelector("#btn-cancel-workout");
    let okWorkoutButton = document.querySelector("#btn-ok-workout");
    await displayInviteList();
    let currentUser = await getCurrentUser();
    let ownerInput = document.querySelector("#inputOwner");
    ownerInput.value = currentUser.username;
    setReadOnly(false, "#form-workout");
    ownerInput.readOnly = !ownerInput.readOnly;

    okWorkoutButton.addEventListener("click", async () => await createWorkout());
    cancelWorkoutButton.addEventListener("click", handleCancelDuringWorkoutCreate);
});
