const functions = require("firebase-functions");
const firebase_tools = require("firebase-tools");
const admin = require("firebase-admin");
// const algoliasearch = require("algoliasearch");

const project = process.env.GCLOUD_PROJECT;
const token = functions.config().ci_token;

admin.initializeApp({
    storageBucket: "burn-project-f8493.appspot.com"
});

let generateId = function(n) {
    let randomChars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
    let id = '';
    // 7 random characters
    for (let i = 0; i < n; i++) {
        id += randomChars.charAt(Math.floor(Math.random() * randomChars.length));
    }
    return id;
}

// Pulls all likes, counts, then pushes to exercise doc with the value under likeCount.
exports.aggregateExerciseLikes = functions.region("australia-southeast1").firestore
    .document("exercises/{exerciseId}/likes/{likeId}")
    .onWrite((change, context) => {

    const exerciseId = context.params.exerciseId;

    const docRef = admin.firestore().collection("exercises").doc(exerciseId);

    return docRef.collection("likes")
        .get()
        .then(querySnapshot => {
        const likeCount = querySnapshot.size;
        const lastActivity = new Date();

        const data = { likeCount, lastActivity };

        return docRef.update(data);
    })
    .catch(e => {
        console.log(e);
    })
})

// " " for follows.
exports.aggregateExerciseFollows = functions.region("australia-southeast1").firestore
    .document("exercises/{exerciseId}/follows/{followId}")
    .onWrite((change, context) => {

    const exerciseId = context.params.exerciseId;

    const docRef = admin.firestore().collection("exercises").doc(exerciseId);

    return docRef.collection("follows")
        .get()
        .then(querySnapshot => {
        
        const followCount = querySnapshot.size;
        const lastActivity = new Date();

        const data = { followCount, lastActivity }

        return docRef.update(data);

    })
    .catch(e => {
        console.log(e);
    })
})

// Pulls all comments, counts, and saves 5 most recent to commentCount and recentComments.
exports.aggregateExerciseComments = functions.region("australia-southeast1").firestore
    .document("exercises/{exerciseId}/comments/{commentId}")
    .onWrite((change, context) => {

    const exerciseId = context.params.exerciseId;

    const docRef = admin.firestore().collection("exercises").doc(exerciseId);

    return docRef.collection("comments").orderBy("createdAt", "desc")
        .get()
        .then(querySnapshot => {
        const commentCount = querySnapshot.size;
        const lastActivity = new Date();

        const recentComments = [];

        querySnapshot.forEach(doc => {
            let d = doc.data();
            d.id = doc.id;
            recentComments.push(d);
        })

        recentComments.splice(5);

        const data = { recentComments, commentCount, lastActivity }

        return docRef.update(data)
    })
    .catch(e => {
        console.log(e);
    })
})

exports.aggregateWorkoutLikes = functions.region("australia-southeast1").firestore
    .document("workouts/{workoutId}/likes/{likeId}")
    .onWrite((change, context) => {

    const workoutId = context.params.workoutId;
    const docRef = admin.firestore().collection("workouts").doc(workoutId);

    return docRef.collection("likes")
        .get()
        .then(querySnapshot => {
            const likeCount = querySnapshot.size;
            const lastActivity = new Date();
            const data = { likeCount, lastActivity };

            return docRef.update(data);
    })
    .catch(e => {
        console.log(e);
    })
})

exports.aggregateWorkoutFollows = functions.region("australia-southeast1").firestore
    .document("workouts/{workoutId}/follows/{followId}")
    .onWrite((change, context) => {

    const workoutId = context.params.workoutId;
    const docRef = admin.firestore().collection("workouts").doc(workoutId);

    return docRef.collection("follows")
        .get()
        .then(querySnapshot => {

        const followCount = querySnapshot.size;
        const lastActivity = new Date();

        const data = { followCount, lastActivity }

        return docRef.update(data);
    })
    .catch(e => {
        console.log(e);
    })
})

exports.aggregateWorkoutComments = functions.region("australia-southeast1").firestore
    .document("workouts/{workoutId}/comments/{commentId}")
    .onWrite((change, context) => {
    
    const workoutId = context.params.workoutId;
    const docRef = admin.firestore().collection("workouts").doc(workoutId);

    return docRef.collection("comments").orderBy("createdAt", "desc")
        .get()
        .then(querySnapshot => {
        
        const commentCount = querySnapshot.size;
        const lastActivity = new Date();

        const recentComments = [];

        querySnapshot.forEach(doc => {
            let d = doc.data();
            d.id = doc.id;
            recentComments.push(d);
        })

        recentComments.splice(5);

        const data = { recentComments, commentCount, lastActivity };

        return docRef.update(data);
    })
    .catch(e => {
        console.log(e);
    })
})


exports.aggregatePostLikes = functions.region("australia-southeast1").firestore
    .document("posts/{postId}/likes/{likeId}")
    .onWrite((change, context) => {
    
    const postId = context.params.postId;
    const docRef = admin.firestore().collection("posts").doc(postId);

    return docRef.collection("likes")
        .get()
        .then(querySnapshot => {
            const likeCount = querySnapshot.size;
            const lastActivity = new Date();
            const data = { likeCount, lastActivity };

            return docRef.update(data)
    })
    .catch(e => {
        console.log(e);
    })
})


exports.aggregatePostComments = functions.region("australia-southeast1").firestore
    .document("posts/{postId}/comments/{commentId}")
    .onWrite((change, context) => {

    const postId = context.params.postId;
    const docRef = admin.firestore().collection("posts").doc(postId);

    return docRef.collection("comments").orderBy("createdAt", "desc")
        .get()
        .then(querySnapshot => {

            const commentCount = querySnapshot.size;
            const lastActivity = new Date();

            const recentComments = [];

            querySnapshot.forEach(doc => {
                let d = doc.data();
                d.id = doc.id;
                recentComments.push(d);
            })

            recentComments.splice(5);

            const data = { recentComments, commentCount, lastActivity };
            
            return docRef.update(data);
    })
    .catch(e => {
        console.log(e);
    })
})


exports.aggregateCommentLikes = functions.region("australia-southeast1").firestore
    .document("{collectionId}/{documentId}/comments/{commentId}/likes/{likeId}")
    .onWrite((change, context) => {
    
    const collectionId = context.params.collectionId;
    const documentId = context.params.documentId;
    const commentId = context.params.commentId;

    const docRef = admin.firestore().collection(collectionId).doc(documentId).collection("comments").doc(commentId);

    console.log("This is the collection:", collectionId);

    return docRef.collection("likes").orderBy("createdAt", "desc")
        .get()
        .then(querySnapshot => {

        const likeCount = querySnapshot.size;
        
        const data = { likeCount }
        return docRef.update(data);
    })
})
    
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
    const user = data.user;

    // Check the workoutForm has been filled out correctly.
    if (workoutForm.exercises.length == 0) {
        throw new functions.https.HttpsError("no-exercises", "No exercises included in workout!");
    }

    workoutForm.createdAt = new Date();
    workoutForm.createdBy = { id: context.auth.uid, username: user.username, profilePhoto: user.profilePhotoUrl };
    workoutForm.likeCount = 0;
    workoutForm.recentComments = [];
    workoutForm.commentCount = 0;
    workoutForm.followCount = 0;

    console.log("WORKOUT FORM:", workoutForm.name, workoutForm.difficulty, workoutForm.description);

    // Build the ID.
    let id = '';
    id += workoutForm.name.replace(/[^A-Za-z0-9]/g, "").substring(0, 8).toLowerCase();
    if (id.length > 0) {
        id += '-';
    }
    id += generateId(16 - id.length);

    console.log("ID", id);

    // First create the document in the workouts collection.
    return admin.firestore().collection("workouts").doc(id).set(workoutForm)
    .then(() => {
        let workoutPayload = { createdAt: workoutForm.createdAt, isFollow: false };
        // Then create in users collection
        return admin.firestore().collection("users").doc(context.auth.uid).collection("workouts").doc(id).set(workoutPayload)
    })
    .then(() => {
        return { id }
    })
    .catch(e => {
        console.error("Error creating workout.", e, "Workout ID:", id);
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
