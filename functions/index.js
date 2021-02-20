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


exports.createLike = functions.region("australia-southeast1").runWith({ timeoutSeconds: 30 })
    .https.onCall((data, context) => {

    const userId = context.auth.uid;
    const user = data.user;
    // As like can be from any collection (posts, workouts, exercises), we must pass through
    // the collection as well as the document.
    const pageType = data.type;
    const collectionRef = admin.firestore().collection(data.collection).doc(data.docId);

    const timestamp = new Date();
    const likeId = generateId(16);
    const batch = admin.firestore().batch();

    // Add like in relevant document.
    batch.set(collectionRef.collection("likes").doc(likeId), { 
        createdAt: timestamp,
        createdBy: { 
            id: userId,
            username: user.username,
            profilePhoto: user.profilePhotoUrl
        }
    });

    // Then in user document.
    batch.set(admin.firestore().collection("users").doc(userId).collection("likes").doc(likeId), { 
        createdAt: timestamp,
        id: data.docId,
        type: pageType
    });

    // Then increment the counter.
    batch.set(collectionRef.collection("likeCounters").doc((Math.floor(Math.random() * 5)).toString()), {
        count: admin.firestore.FieldValue.increment(1)
    });

    // Then commit this batch.
    return batch.commit().then(() => {
        return { id: likeId }
    })

})



exports.createWorkout = functions.region("australia-southeast1").runWith({ timeoutSeconds: 30 })
    .https.onCall((data, context) => {

    const workoutForm = data.workoutForm;
    const userId = context.auth.uid
    const user = data.user;

    // Check the workoutForm has been filled out correctly.
    if (workoutForm.exercises.length == 0) {
        console.warn("Tried to upload workout without exercises");
        throw new functions.https.HttpsError("invalid-argument", "No exercises included in workout!");
    }

    workoutForm.createdAt = new Date();
    workoutForm.createdBy = { id: userId, username: user.username, profilePhoto: user.profilePhotoUrl };
    workoutForm.likeCount = 0;
    workoutForm.recentComments = [];
    workoutForm.commentCount = 0;
    workoutForm.followCount = 0;

    // Build the ID.
    let workoutId = '';
    workoutId += workoutForm.name.replace(/[^A-Za-z0-9]/g, "").substring(0, 8).toLowerCase();
    if (workoutId.length > 0) {
        workoutId += '-';
    }
    workoutId += generateId(16 - workoutId.length);

    const batch = admin.firestore().batch();

    // First create in workouts collection.
    batch.set(admin.firestore().collection("workouts").doc(workoutId), workoutForm);

    // Then create in user document.
    batch.set(admin.firestore().collection("users").doc(userId).collection("workouts").doc(workoutId), {
        createdAt: workoutForm.createdAt,
        isFollow: false
    });

    // Now create distributed counter in workouts collection.
    for (let i = 0; i < 5; i ++) {
        const shardRef = admin.firestore().collection("workouts").doc(workoutId).collection("likeCounters").doc(i.toString()); 
        batch.set(shardRef, { count: 0 });
    }

    // Commit the batch.
    return batch.commit().then(() => {
        return { id: workoutId };
    })

})



exports.createExercise = functions.region("australia-southeast1").runWith({ timeoutSeconds: 30 })
    .https.onCall((data, context) => {

    const exerciseForm = data.exerciseForm;
    const user = data.user;
    const userId = context.auth.uid;
    
    exerciseForm.createdBy = {id: userId, username: user.username, profilePhoto: user.profilePhotoUrl};
    exerciseForm.createdAt = new Date();
    exerciseForm.likeCount = 0;
    exerciseForm.recentComments = [];
    exerciseForm.commentCount = 0;
    exerciseForm.followCount = 0;

    exerciseForm.suggestedSets.forEach (s => {
        delete s.id;
        s.measureAmount = Number(s.measureAmount);
    })

    if (exerciseForm.imgPaths.length == 0) {
        throw new functions.https.HttpsError("invalid-argument", "No images included.");
    }

    let exerciseId = '';
    exerciseId += exerciseForm.name.replace(/[^A-Za-z0-9]/g, "").substring(0, 8).toLowerCase();
    if (exerciseId.length > 0) {
        exerciseId += '-';
    }
    exerciseId += generateId(16 - exerciseId.length);

    // Now upload the doc to exercises collection.
    return admin.firestore().collection("exercises").doc(exerciseId).set(exerciseForm)
    .then(() => {
        let exercisePayload = { createdAt: exerciseForm.createdAt, isFollow: false };
        // Now upload to users collection.
        return admin.firestore().collection("users").doc(userId).collection("exercises").doc(exerciseId).set(exercisePayload)
    })
    .then(() => {
        console.log("Created exercise at:", exerciseId);
        return { id: exerciseId };
    })
    .catch(e => {
        console.error("Error creating exercise", e, "exercise ID:", exerciseId);
        throw new functions.https.HttpsError("unknown", "Error creating exercise.");
    })
})


exports.createPost = functions.region("australia-southeast1").runWith({ timeoutSeconds: 30 })
    .https.onCall((data, context) => {

    const postForm = data.postForm;
    const user = data.user;
    const userId = context.auth.uid;

    if (!postForm.content) {
        throw new functions.https.HttpsError("invalid-argument", "Post must have content");
    }

    postForm.createdBy = { id: userId, username: user.username, profilePhoto: user.profilePhotoUrl };
    postForm.createdAt = new Date();
    postForm.likeCount = 0;
    postForm.recentComments = [];
    postForm.commentCount = 0;

    let postId;

    // First upload to posts collection.
    return admin.firestore().collection("posts").add(postForm)
    .then(postRef => {
        let postPayload = { createdAt: postForm.createdAt };
        postId = postRef.id;
        // Then upload to user collection.
        return admin.firestore().collection("users").doc(userId).collection("posts").doc(postId).set(postPayload)
    })
    .then(() => {
        console.log("Post created at:", postId)
        return { id: postId };
    })
    .catch(e => {
        console.error("Error creating post", e, "post Id:", postId);
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
