async function createNewGroupSession(athletes) {
    let currentUser = await getCurrentUser();
    if (currentUser.athletes.length == 0) {
        let alert = createAlert("You need to have athletes in your roster to create a new group training session", null);
        document.body.prepend(alert);
    }
    else {
        window.location.replace("groupworkout.html");
    }
}

async function displayCurrentRoster() {
    let templateFilledAthlete = document.querySelector("#template-filled-athlete");
    let templateStatsCreator = document.querySelector("#template-stats-creator");
    let templateEmptyAthlete = document.querySelector("#template-empty-athlete");
    let controls = document.querySelector("#controls");

    let currentUser = await getCurrentUser();
    let response = await sendRequest('GET', `${HOST}/api/exercises/`)

    if (!response.ok) throw new Error('Could not load exercises: ' + JSON.stringify(await response.json()))

    const { results: exercises } = await response.json()

    for (let athleteUrl of currentUser.athletes) {
        let response = await sendRequest("GET", athleteUrl);
        let athlete = await response.json();

        createFilledRow(templateFilledAthlete, athlete.username, controls, false);
        createStatsCreatorRow(templateStatsCreator, athlete.workouts, exercises, controls)
    }

    let status = "p";   // pending
    let category = "sent";
    response = await sendRequest("GET", `${HOST}/api/offers/?status=${status}&category=${category}`);
    if (!response.ok) {
        let data = await response.json();
        let alert = createAlert("Could not retrieve offers!", data);
        document.body.prepend(alert);
    } else {
        let offers = await response.json();

        for (let offer of offers.results) {
            let response = await sendRequest("GET", offer.recipient);
            let recipient = await response.json();
            createFilledRow(templateFilledAthlete, `${recipient.username} (pending)`, controls, true);
        }
    }

    let emptyClone = templateEmptyAthlete.content.cloneNode(true);
    let emptyDiv = emptyClone.querySelector("div");
    let emptyButton = emptyDiv.querySelector("button");
    emptyButton.addEventListener("click", addAthleteRow);
    controls.appendChild(emptyDiv);
}

function createFilledRow(templateFilledAthlete, inputValue, controls, disabled) {
    let filledClone = templateFilledAthlete.content.cloneNode(true);
    let filledDiv = filledClone.querySelector("div");
    let filledInput = filledDiv.querySelector("input");
    let filledButton = filledDiv.querySelector("button");
    filledInput.value = inputValue;
    filledInput.disabled = disabled;
    if (!disabled) {
        filledButton.addEventListener("click", removeAthleteRow);
    }
    else {
        filledButton.disabled = true;
    }

    controls.appendChild(filledDiv);
}

function createStatsCreatorRow(templateStatsCreator, workoutUrls, exercises, controls) {
    let clone = templateStatsCreator.content.cloneNode(true)
    let div = clone.querySelector('div');
    let select = clone.querySelector('select')
    let button = div.querySelector('button')

    select.innerHTML = `
<option selected value="-1">All exercises</option>
${exercises.map(e => `<option value="${e.id}">${e.name}</option>`)}
`

    button.addEventListener("click", async e => {
        let templateAthleteStats = document.querySelector("#template-athlete-stats");
        let templateAthleteTable = document.querySelector("#template-athlete-table");
        const parent = e.currentTarget.parentElement
        const exerciseFilter = parseInt(select.value, 10)

        const workouts = await Promise.all(workoutUrls.map(async w => {
            const response = await sendRequest('GET', w)
            if (response.ok) {
                return await response.json()
            } else {
                throw new Error('Could not fetch workouts')
            }
        }))
        const enriched = (await Promise.all(workouts.map(async w => ({
            ...w,
            exercise_instances: (await Promise.all(w.exercise_instances.map(async e => ({
                ...e,
                exercise: await getExercise(e.exercise),
            })))).filter(e => exerciseFilter === -1 || e.exercise.id === exerciseFilter),
        })))).filter(w => w.exercise_instances.length > 0)

        await createTableRow(templateAthleteTable, enriched, parent)
        await createStatsRow(templateAthleteStats, enriched, parent)
        parent.remove()
    })

    controls.appendChild(div)
}

async function getExercise(exercise_instance) {
    const response = await sendRequest('GET', exercise_instance)
    if (response.ok) {
        return await response.json()
    } else {
        throw new Error('Could not fetch exercise instance')
    }
}

async function createStatsRow(templateAthleteStats, workouts, controls) {
    if (workouts.length < 2) return

    let statsClone = templateAthleteStats.content.cloneNode(true)
    let statsDiv = statsClone.querySelector("div")
    controls.after(statsDiv)

    const data = await getStats(workouts)
    const options = {
        chart: { type: 'line' },
        xaxis: { type: 'datetime' },
        series: [{ name: 'exercises', data: data }],
        title: { text: `${workouts.length} performed workout(s)` }
    }
    const chart = new ApexCharts(statsDiv, options);
    chart.render()
}

async function createTableRow(templateAthleteTable, enriched, controls) {
    let tableClone = templateAthleteTable.content.cloneNode(true)
    let table = tableClone.querySelector('table')

    table.innerHTML = `
<thead>
    <tr>
        <th>Name</th>
        <th>Date</th>
        <th>Exercises</th>
    </tr>
</thead>
<tbody>
    ${enriched.length > 0
            ? (enriched.map(w => `
    <tr>
        <td>${w.name}</td>
        <td>${new Date(w.date).toLocaleString()}</td>
        <td>${w.exercise_instances.map(e => `${e.sets}x${e.number} ${e.exercise.name}`).join(', ')}</td>
    </tr>
    `)).join('')
            : `
    <tr>
        <td></td>
        <td><i>(no data)</i></td>
        <td></td>
    </tr>
    `}
</tbody>
`;

    controls.after(table)
}

async function displayFiles() {
    let user = await getCurrentUser();

    let templateAthlete = document.querySelector("#template-athlete-tab");
    let templateFiles = document.querySelector("#template-files");
    let templateFile = document.querySelector("#template-file");
    let listTab = document.querySelector("#list-tab");
    let navTabContent = document.querySelector("#nav-tabContent");

    for (let fileUrl of user.athlete_files) {
        let response = await sendRequest("GET", fileUrl);
        let file = await response.json();

        response = await sendRequest("GET", file.athlete);
        let athlete = await response.json();

        let tabPanel = document.querySelector(`#tab-contents-${athlete.username}`)
        if (!tabPanel) {
            tabPanel = createTabContents(templateAthlete, athlete, listTab, templateFiles, navTabContent);
        }

        let divFiles = tabPanel.querySelector(".uploaded-files");
        let aFile = createFileLink(templateFile, file.file);

        divFiles.appendChild(aFile);
    }

    for (let athleteUrl of user.athletes) {
        let response = await sendRequest("GET", athleteUrl);
        let athlete = await response.json();

        let tabPanel = document.querySelector(`#tab-contents-${athlete.username}`)
        if (!tabPanel) {
            tabPanel = createTabContents(templateAthlete, athlete, listTab, templateFiles, navTabContent);
        }
        let uploadBtn = document.querySelector(`#btn-upload-${athlete.username}`);
        uploadBtn.disabled = false;
        uploadBtn.addEventListener("click", async (event) => await uploadFiles(event, athlete));

        let fileInput = tabPanel.querySelector(".form-control");
        fileInput.disabled = false;
    }

    if (user.athlete_files.length == 0 && user.athletes.length == 0) {
        let p = document.createElement("p");
        p.innerText = "There are currently no athletes or uploaded files.";
        document.querySelector("#list-files-div").append(p);
    }
}

function createTabContents(templateAthlete, athlete, listTab, templateFiles, navTabContent) {
    let cloneAthlete = templateAthlete.content.cloneNode(true);

    let a = cloneAthlete.querySelector("a");
    a.id = `tab-${athlete.username}`;
    a.href = `#tab-contents-${athlete.username}`;
    a.text = athlete.username;
    listTab.appendChild(a);

    let tabPanel = templateFiles.content.firstElementChild.cloneNode(true);
    tabPanel.id = `tab-contents-${athlete.username}`;

    let uploadBtn = tabPanel.querySelector('input[value="Upload"]');
    uploadBtn.id = `btn-upload-${athlete.username}`;

    navTabContent.appendChild(tabPanel);
    return tabPanel;
}

function createFileLink(templateFile, fileUrl) {
    let cloneFile = templateFile.content.cloneNode(true);
    let aFile = cloneFile.querySelector("a");
    aFile.href = fileUrl;
    let pathArray = fileUrl.split("/");
    aFile.text = pathArray[pathArray.length - 1];
    return aFile;
}

function addAthleteRow(event) {
    let newBlankRow = event.currentTarget.parentElement.cloneNode(true);
    let newInput = newBlankRow.querySelector("input");
    newInput.value = "";
    let controls = document.querySelector("#controls");
    let button = newBlankRow.querySelector("button");
    button.addEventListener("click", addAthleteRow);
    controls.appendChild(newBlankRow);

    event.currentTarget.className = "btn btn-danger btn-remove";
    event.currentTarget.querySelector("i").className = "fas fa-minus";
    event.currentTarget.removeEventListener("click", addAthleteRow);
    event.currentTarget.addEventListener("click", removeAthleteRow);
}

function removeAthleteRow(event) {
    event.currentTarget.parentElement.remove();
}

async function submitRoster() {
    let rosterInputs = document.querySelectorAll('input[name="athlete"]');

    let currentUser = await getCurrentUser();
    let body = { favourite_exercise: currentUser.favourite_exercise, "athletes": [] };

    for (let rosterInput of rosterInputs) {
        if (!rosterInput.disabled && rosterInput.value) {
            // get user
            let response = await sendRequest("GET", `${HOST}/api/users/${rosterInput.value}/`);
            if (response.ok) {
                let athlete = await response.json();
                if (athlete.coach == currentUser.url) {
                    body.athletes.push(athlete.id);
                } else {
                    // create offer
                    let body = { 'status': 'p', 'recipient': athlete.url };
                    let response = await sendRequest("POST", `${HOST}/api/offers/`, body);
                    if (!response.ok) {
                        let data = await response.json();
                        let alert = createAlert("Could not create offer!", data);
                        document.body.prepend(alert);
                    }
                }
            } else {
                let data = await response.json();
                let alert = createAlert(`Could not retrieve user ${rosterInput.value}!`, data);
                document.body.prepend(alert);
            }
        }
    }
    let response = await sendRequest("PUT", currentUser.url, body);
    location.reload();
}

async function uploadFiles(event, athlete) {
    let form = event.currentTarget.parentElement;
    let inputFormData = new FormData(form);
    let templateFile = document.querySelector("#template-file");

    for (let file of inputFormData.getAll("files")) {
        if (file.size > 0) {
            let submitForm = new FormData();
            submitForm.append("file", file);
            submitForm.append("athlete", athlete.url);

            let response = await sendRequest("POST", `${HOST}/api/athlete-files/`, submitForm, "");
            if (response.ok) {
                let data = await response.json();

                let tabPanel = document.querySelector(`#tab-contents-${athlete.username}`)
                let divFiles = tabPanel.querySelector(".uploaded-files");
                let aFile = createFileLink(templateFile, data["file"]);
                divFiles.appendChild(aFile);
            } else {
                let data = await response.json();
                let alert = createAlert("Could not upload files!", data);
                document.body.prepend(alert);
            }
        }
    }
}

window.addEventListener("DOMContentLoaded", async () => {
    await displayCurrentRoster();
    await displayFiles();

    let buttonSubmitRoster = document.querySelector("#button-submit-roster");
    buttonSubmitRoster.addEventListener("click", async () => await submitRoster());

    let createNewGroupTrainingSession = document.querySelector("#create-new-group-training-session")
    createNewGroupTrainingSession.addEventListener("click", async () => await createNewGroupSession())
});
