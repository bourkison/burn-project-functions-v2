const functions = require("firebase-functions");
const firebase_tools = require("firebase-tools");
const admin = require("firebase-admin");

const project = process.env.GCLOUD_PROJECT;
const token = functions.config().ci_token;

admin.initializeApp({
    storageBucket: "burn-project-f8493.appspot.com"
});

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
    .https.onCall((data, context) => {
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