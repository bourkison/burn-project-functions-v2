const functions = require("firebase-functions");
const firebase_tools = require("firebase-tools");
const admin = require("firebase-admin");
const algoliasearch = require("algoliasearch");

const project = process.env.GCLOUD_PROJECT;
const token = functions.config().ci_token;

const numShards = 10;

admin.initializeApp({
    storageBucket: "burn-project-f8493.appspot.com"
});

const algoliaClient = algoliasearch(functions.config().algolia.appid, functions.config().algolia.apikey);

let generateId = function(n) {
    let randomChars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
    let id = '';
    // 7 random characters
    for (let i = 0; i < n; i++) {
        id += randomChars.charAt(Math.floor(Math.random() * randomChars.length));
    }
    return id;
}
    
// Deleting Exercises and Workouts is too intensive on the client end (as all comments, 
// likes and follows must be deleted too), so we do it on server side.
// TODO: Delete comment likes from user's doc. Delete exercise from relevant workouts.
exports.deleteCollection = functions.region("australia-southeast1").runWith({ timeoutSeconds: 540 })
    .https.onCall(async (data, context) => {
        // TODO: Add auth here.
        const path = data.path;
        const collectionName = path.split("/")[0];
        const docId = path.split("/")[path.split("/").length - 1];

        const docRef = admin.firestore().collection(collectionName).doc(docId);
        
        docRef.get().then(doc => {
            if (!doc.exists) {
                console.log("Attempting to delete document that does not exist.");
                return res.status(500).send("Document does not exist");
            }

            if (doc.data().createdBy.id != context.auth.uid) {
                console.log("Unauthorized user attempted to delete document:", docId, context.auth.uid);
                return res.status(500).send("Insufficient permissions.");
            }
            

            // Delete likes from User's collection.
            docRef.collection("likes").get().then(likeSnapshot => {
                likeSnapshot.forEach(like => {
                    const userId = like.data().createdBy.id;
                    admin.firestore().collection("users").doc(userId).collection("likes").doc(like.id).delete().then(() => {
                        console.log("Deleted like from user collection.");
                    }).catch(e => {
                        console.warn("Error deleting like document from user's collection.", e);
                    })
                })
            }).catch(e => {
                console.log("Error retrieving likes from exercise document.", e);
            })

            // Delete comments from User's collection.
            docRef.collection("comments").get().then(commentSnapshot => {
                commentSnapshot.forEach(comment => {
                    const userId = comment.data().createdBy.id;
                    admin.firestore().collection("users").doc(userId).collection("comments").doc(comment.id).delete().then(() => {
                        console.log("Deleted comment from user collection.");
                    }).catch(e => {
                        console.warn("Error deleting comment document from user's collection.", e);
                    })
                })
            }).catch(e => {
                console.log("Error retrieving comments from exercise document.", e);
            })

            // Delete follows from User's collection.
            docRef.collection("follows").get().then(followSnapshot => {
                followSnapshot.forEach(follow => {
                    const userId = follow.data().createdBy.id;
                    admin.firestore().collection("users").doc(userId).collection(collectionName).doc(doc.id).delete().then(() => {
                        console.log("Deleted follow from user collection.");
                    }).catch(e => {
                        console.warn("Error deleting follow document from user's collection.", e);
                    })
                })
            }).catch(e => {
                console.log("Error retrieving follows from exercise document.", e);
            })

            // Delete images from the storage IF we are in exercises.
            if (collectionName === "exercises") {
                const storagePath = "exercises/" + docId;
                admin.storage().bucket().deleteFiles({ prefix: storagePath }).then(() => {
                    console.log("Deleted exercise data from storage.");
                }).catch(e => {
                    console.warn("Error deleting data from storage.");
                });
            }

            // Finally delete from User who created's exercises collection.
            admin.firestore().collection("users").doc(context.auth.uid).collection(collectionName).doc(doc.id).delete().then(() => {
                console.log("Deleted exercise from created user's exercises.");
            }).catch(e => {
                console.warn("Error deleting exercise from user who created's " + collectionName + " collection.", e);
            })

        })
        
        return firebase_tools.firestore
            .delete(path, {
                project,
                token,
                recursive: true,
                yes: true
        }).then(() => ({ result: "Deleted successfully." }));
});



exports.createWorkout = functions.region("australia-southeast1").runWith({ timeoutSeconds: 30 })
    .https.onCall((data, context) => {

    const workoutForm = data.workoutForm;
    const userId = context.auth.uid
    const user = data.user;

    // Check the workoutForm has been filled out correctly.
    if (workoutForm.exercises.length == 0) {
        console.warn("Tried to upload workout without exercises");
        throw new functions.https.HttpsError("invalid-argument", "Workout must include exercises");
    }

    workoutForm.createdAt = new Date();
    workoutForm.lastActivity = workoutForm.createdAt;
    workoutForm.createdBy = { id: userId, username: user.username, profilePhoto: user.profilePhoto };

    // Build the ID.
    let workoutId = '';
    workoutId += workoutForm.name.replace(/[^A-Za-z0-9]/g, "").substring(0, 8).toLowerCase();
    if (workoutId.length > 0) {
        workoutId += '-';
    }
    workoutId += generateId(16 - workoutId.length);

    const record = { objectID: workoutId, name: workoutForm.name };

    const batch = admin.firestore().batch();

    // First create in workouts collection.
    batch.set(admin.firestore().collection("workouts").doc(workoutId), workoutForm);

    // Then create in user document.
    batch.set(admin.firestore().collection("users").doc(userId).collection("workouts").doc(workoutId), {
        createdAt: workoutForm.createdAt,
        isFollow: false
    });

    // Now create distributed counter in workouts collection.
    for (let i = 0; i < numShards; i ++) {
        const shardRef = admin.firestore().collection("workouts").doc(workoutId).collection("counters").doc(i.toString()); 
        batch.set(shardRef, { likeCount: 0, commentCount: 0, followCount: 0 });
    }

    // Commit the batch.
    return batch.commit()
    .then(() => {
        const algoliaWorkoutIndex = algoliaClient.initIndex("workouts");
        return algoliaWorkoutIndex.saveObject(record);
    })
    .then(() => {
        return { id: workoutId };
    })
    .catch(e => {
        console.error("Error creating workout", e, "workout ID:", workoutId);
        throw new functions.https.HttpsError("unknown", "Error creating workout");
    })
})


exports.editWorkout = functions.region("australia-southeast1").runWith({ timeoutSeconds: 30 })
    .https.onCall((data, context) => {

    const workoutForm = data.workoutForm;
    const workoutId = workoutForm.id;
    
    workoutForm.lastActivity = new Date();

    // Check if workout form has been filled out correctly.
    if (!workoutForm.name) {
        throw new functions.https.HttpsError("invalid-argument", "Workout must have a name");
    } else if (!workoutForm.description) {
        throw new functions.https.HttpsError("invalid-argument", "Workout must have a description");
    } else if (workoutForm.exercises.length == 0) {
        throw new functions.https.HttpsError("invalid-argument", "Workout must include exercises");
    }

    delete workoutForm.id;

    // Pull current workout to see createdBy accurately.
    return admin.firestore().collection("workouts").doc(workoutId).get()
    .then(workoutDoc => {
        if (context.auth.uid !== workoutDoc.data().createdBy.id) {
            throw new functions.https.HttpsError("permission-denied", "User does not have permissions to edit this workout.");
        }

        return admin.firestore().collection("workouts").doc(workoutId).update(workoutForm)
    })
    .then(() => {
        if (data.updateAlgolia) {
            console.log("Updating algolia...");
            const record = { objectID: workoutId, name: workoutForm.name }
            const algoliaWorkoutIndex = algoliaClient.initIndex("workouts");
            return algoliaWorkoutIndex.partialUpdateObject(record)
        }
    })
    .then(() => {
        return { id: workoutId }
    })
    .catch(e => {
        console.error("Error updating workout:", e);
        throw new functions.https.HttpsError("unknown", "Error updating workout");
    })
})



exports.createUser = functions.region("australia-southeast1").runWith({ timeoutSeconds: 30 })
    .https.onCall((data, context) => {

    const userForm = data.userForm;
    const userId = data.userId;

    userForm.createdAt = new Date();
    userForm.lastActivty = userForm.createdAt;
    userForm.followerCount = 0;
    userForm.followingCount = 0;

    const record = { objectID: userId, username: userForm.username, firstName: userForm.firstName, surname: userForm.surname, profilePhoto: userForm.profilePhoto };

    if (!userForm.username) {
        throw new functions.https.HttpsError("invalid-argument", "Must include a username.");
    }

    return admin.firestore().collection("users").where("username", "==", userForm.username).get()
    .then(userSnapshot => {
        if (userSnapshot.size == 0) {
            return admin.firestore().collection("users").doc(userId).set(userForm)
        } else {
            // TODO, as user has already created the Auth user, we need to delete the one they have created.
            // Can do that asynchronously.
            throw new functions.https.HttpsError("invalid-argument", "Username not unique")
        }
    })
    .then(() => {
        const algoliaUserIndex = algoliaClient.initIndex("users");
        return algoliaUserIndex.saveObject(record);
    })
    .then(() => {
        return { id: userId };
    })
    .catch(e => {
        console.error("Error creating user", e, "user ID:", userId);
        throw new functions.https.HttpsError("unknown", "Error creating user");
    })
})


exports.createExercise = functions.region("australia-southeast1").runWith({ timeoutSeconds: 30 })
    .https.onCall((data, context) => {

    const exerciseForm = data.exerciseForm;
    const exerciseId = exerciseForm.id;
    const user = data.user;
    const userId = context.auth.uid;

    delete exerciseForm.id
    
    exerciseForm.createdBy = { id: userId, username: user.username, profilePhoto: user.profilePhoto };
    exerciseForm.createdAt = new Date();
    exerciseForm.lastActivity = exerciseForm.createdAt;

    const record = { objectID: exerciseId, name: exerciseForm.name }

    if (exerciseForm.filePaths.length == 0) {
        throw new functions.https.HttpsError("invalid-argument", "No images included.");
    }

    if (!exerciseForm.description) {
        throw new functions.https.HttpsError("invalid-argument", "No description included.");
    }

    const batch = admin.firestore().batch();

    // First upload to exercises collection.
    batch.set(admin.firestore().collection("exercises").doc(exerciseId), exerciseForm);

    // Now in users collection.
    batch.set(admin.firestore().collection("users").doc(userId).collection("exercises").doc(exerciseId), {
        createdAt: exerciseForm.createdAt,
        isFollow: false
    });

    // Now create distributed counter in exercises collection.
    for (let i = 0; i < numShards; i++) {
        const shardRef = admin.firestore().collection("exercises").doc(exerciseId).collection("counters").doc(i.toString());
        batch.set(shardRef, { likeCount: 0, commentCount: 0, followCount: 0 });
    }

    return batch.commit()
    .then(() => {
        const algoliaExerciseIndex = algoliaClient.initIndex("exercises");
        return algoliaExerciseIndex.saveObject(record);
    })
    .then(() => {
        return { id: exerciseId };
    })
    .catch(e => {
        console.error("Error creating exercise", e, "exercise ID:", exerciseId);
        throw new functions.https.HttpsError("unknown", "Error creating exercise");
    })
})



exports.editExercise = functions.region("australia-southeast1").runWith({ timeoutSeconds: 30 })
    .https.onCall((data, context) => {

    const exerciseForm = data.exerciseForm;
    const exerciseId = exerciseForm.id;

    exerciseForm.lastActivity = new Date();

    // Check if the form is filled out correctly.
    if (!exerciseForm.name) {
        throw new functions.https.HttpsError("invalid-argument", "Exercise must have a name");
    } else if (!exerciseForm.description) {
        throw new functions.https.HttpsError("invalid-argument", "Exercise must have a description");
    } else if (exerciseForm.filePaths.length === 0) {
        throw new functions.https.HttpsError("invalid-argument", "Exercise must have either images/files");
    }

    delete exerciseForm.id;

    // Pull current iteration of the exercise to pull createdBy accurately (in case exerciseForm has been tampered).
    return admin.firestore().collection("exercises").doc(exerciseId).get()
    .then(exerciseDoc => {
        console.log("Downloaded the exercise for reference check:", exerciseDoc.data().createdBy.id);

        if (context.auth.uid !== exerciseDoc.data().createdBy.id) {
            throw new functions.https.HttpsError("permission-denied", "User does not have permissions to edit this exercise");
        }

        return admin.firestore().collection("exercises").doc(exerciseId).update(exerciseForm)
    })
    .then(() => {
        if (data.updateAlgolia) {
            const record = { objectID: exerciseId, name: exerciseForm.name }
            const algoliaExerciseIndex = algoliaClient.initIndex("exercises");
            return algoliaExerciseIndex.partialUpdateObject(record);
        }
    })
    .then(() => {
        return { id: exerciseId };
    })
    .catch(e => {
        console.error("Error updating exercise", e);
        throw new functions.https.HttpsError("unknown", "Error updating exercise");
    })
})



exports.createPost = functions.region("australia-southeast1").runWith({ timeoutSeconds: 30 })
    .https.onCall((data, context) => {

    const postForm = data.postForm;
    const postId = data.postForm.id;
    const user = data.user;
    const userId = context.auth.uid;

    delete postForm.id

    if (!postForm.content) {
        throw new functions.https.HttpsError("invalid-argument", "Post must have content");
    }

    postForm.createdBy = { id: userId, username: user.username, profilePhoto: user.profilePhoto };
    postForm.createdAt = new Date();

    const batch = admin.firestore().batch();

    // First upload to posts collection.
    batch.set(admin.firestore().collection("posts").doc(postId), postForm);

    // Then upload to user collection.
    batch.set(admin.firestore().collection("users").doc(userId).collection("posts").doc(postId), {
        createdAt: postForm.createdAt
    });

    for (let i = 0; i < numShards; i++) {
        const shardRef = admin.firestore().collection("posts").doc(postId).collection("counters").doc(i.toString());
        batch.set(shardRef, { likeCount: 0, commentCount: 0 });
    }

    return batch.commit()
    .then(() => {
        console.log("Post created at:", postId);
        return { id: postId };
    })
    .catch(e => {
        console.error("Error creating post", e, "post ID:", postId);
        throw new functions.https.HttpsError("unknown", "Error creating post");
    })
})


exports.buildFeed = functions.region("australia-southeast1").runWith({ timeoutSeconds: 540 })
    .https.onCall((data, context) => {

    const userId = context.auth.uid;
    const userDocRef = admin.firestore().collection("users").doc(userId);

    return userDocRef.collection("following").get()
    .then(followingSnapshot => {
        let promises = [];

        // Begin download of all following users.
        followingSnapshot.forEach(following => {
            const followingId = following.id;
            promises.push(admin.firestore().collection("users").doc(followingId).collection("posts").get())
        })

        // Also download users posts.
        promises.push(admin.firestore().collection("users").doc(userId).collection("posts").get())

        // Return promises.
        return Promise.all(promises);

    })
    .then(postSnapshots => {
        let temp = [];
        let posts = [];
        postSnapshots.forEach(postSnapshot => {
            postSnapshot.forEach(post => {
                temp.push({ id: post.id, data: post.data()})
            })
        })

        temp.sort(function(a, b) { return b.data.createdAt.seconds - a.data.createdAt.seconds })

        temp.forEach(post => {
            posts.push(post.id);
        })

        return { posts }
    })
    .catch(error => {
        console.error(error);
        throw new functions.https.HttpsError('failed-precondition', error);
    })
})


// ALGOLIA
