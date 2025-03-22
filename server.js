"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
const express_1 = __importDefault(require("express"));
const firebase_admin_1 = __importDefault(require("firebase-admin"));
const cors_1 = __importDefault(require("cors"));
// Inisialisasi Firebase Admin
const serviceAccountKey_json_1 = __importDefault(require("../serviceAccountKey.json"));
firebase_admin_1.default.initializeApp({
    credential: firebase_admin_1.default.credential.cert(serviceAccountKey_json_1.default),
});
const app = (0, express_1.default)();
app.use(express_1.default.json());
app.use((0, cors_1.default)());
app.post('/api/createUser', async (req, res) => {
    const { email, password, username } = req.body;
    try {
        const userRecord = await firebase_admin_1.default.auth().createUser({
            email,
            password,
            displayName: username,
        });
        await firebase_admin_1.default.auth().setCustomUserClaims(userRecord.uid, { role: 'user' });
        res.status(201).json({ message: 'User created successfully', user: userRecord });
    }
    catch (error) {
        res.status(400).json({ error: error.message });
    }
});
app.get('/api/getUsers', async (req, res) => {
    try {
        const listUsers = await firebase_admin_1.default.auth().listUsers();
        res.status(200).json(listUsers.users);
    }
    catch (error) {
        res.status(400).json({ error: error.message });
    }
});
app.delete('/api/deleteUser/:uid', async (req, res) => {
    try {
        await firebase_admin_1.default.auth().deleteUser(req.params.uid);
        res.status(200).json({ message: 'User deleted successfully' });
    }
    catch (error) {
        res.status(400).json({ error: error.message });
    }
});
const PORT = process.env.PORT || 6000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
