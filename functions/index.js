const functions = require("firebase-functions");
const firebase_tools = require("firebase-tools");
const admin = require("firebase-admin");

const project = process.env.GCLOUD_PROJECT;
const token = functions.config().ci_token;
admin.initializeApp();

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


// path.get().then(doc => {
    //     if (!doc.exists) {
    //         console.log("No such document.")
    //         return res.send("Not found")
    //     }

    //     if (doc.data().createdBy != context.auth.uid) {
    //         return res.send("Insufficient permissions.");
    //     }

    //     console.log("Document found. Now deleting.");
// })
    
// Deleting Exercises and Workouts is too intensive on the client end (as all comments, 
// likes and follows must be deleted too), so we do it on server side.
exports.deleteExercise = functions.region("australia-southeast1").runWith({ timeoutSeconds: 540 })
    .https.onCall((data, context) => {
        // TODO: Add auth here.
        const path = data.path;
        console.log(path.fullPath);
        console.log("CALLED")
        
        return firebase_tools.firestore
            .delete(path, {
                project,
                token,
                recursive: true,
                yes: true
        }).then(() => ({ result: "Deleted successfully." }));
});