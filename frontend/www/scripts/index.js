

async function setFavouriteExercise() {
    const user = await getCurrentUser()
    return user.favourite_exercise;
}

const promise = setFavouriteExercise();
promise.then(fav =>
    document.getElementById("workout").innerHTML = fav
)
