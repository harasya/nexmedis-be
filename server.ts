import 'dotenv/config'
import express, { Request, Response } from 'express'
import admin from 'firebase-admin'
import cors from 'cors'
import fs from 'fs'
import { fileURLToPath } from 'url'
import path from 'path'
import { format } from 'date-fns'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
// Inisialisasi Firebase Admin

const serviceAccount = JSON.parse(
  fs.readFileSync(path.join(__dirname, '/serviceAccountKey.json'), 'utf-8'),
)

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
})

const db = admin.firestore()
const app = express()
app.use(express.json())
app.use(cors())


app.post('/api/createUser', async (req: Request, res: Response) => {
  const { email, password, username } = req.body

  try {
    const userRecord = await admin.auth().createUser({
      email,
      password,
      displayName: username,
    })

    await admin.auth().setCustomUserClaims(userRecord.uid, { role: 'user' })

    await db.collection('users').doc(userRecord.uid).set({
      username,
      email,
      role: 'user',
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    })

    res.status(201).json({
      message: 'User created successfully',
      user: { uid: userRecord.uid, email, username },
    })
  } catch (error) {
    res.status(400).json({ error: (error as { message: string }).message })
  }
})

app.get('/api/getUsers', async (req, res) => {
  try {
    const usersRef = db.collection('users')
    const snapshot = await usersRef.get()

    if (snapshot.empty) {
      return res.status(200).json({ message: 'No users found' })
    }

    const users = snapshot.docs.map((doc) => {
      const data = doc.data()

      if (data.createdAt?._seconds) {
        data.createdAt = format(new Date(data.createdAt._seconds * 1000), 'yyyy-MM-dd HH:mm:ss')
      }

      return {
        id: doc.id,
        ...data,
      }
    })

    const listUsers = await admin.auth().listUsers()
    const authUsers = listUsers.users.map((user) => ({
      uid: user.uid,
      email: user.email,
      displayName: user.displayName || null,
    }))

    const combinedUsers = users.map((user) => {
      const authUser = authUsers.find((auth) => auth.uid === user.id)
      return {
        ...user,
        email: authUser?.email || null,
        displayName: authUser?.displayName || null,
      }
    })

    res.status(200).json(combinedUsers)
  } catch (error) {
    res.status(400).json({ error: (error as { message: string }).message })
  }
})

app.delete('/api/deleteUser/:uid', async (req, res) => {
  try {
    await admin.auth().getUser(req.params.uid)
    await admin.auth().deleteUser(req.params.uid)
    await db.collection('users').doc(req.params.uid).delete()
    res.status(200).json({ message: 'User deleted successfully' })
  } catch (error: unknown) {
    res.status(400).json({ error: (error as { message: string }).message })
  }
})

app.put('/api/updateUser/:uid', async (req: Request, res: Response) => {
  const { uid } = req.params
  const { email, username } = req.body

  try {
    await admin.auth().updateUser(uid, {
      email,
      displayName: username,
    })

    await db.collection('users').doc(uid).update({
      username,
      email,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    })

    res.status(200).json({ message: 'User updated successfully' })
  } catch (error) {
    res.status(400).json({ error: (error as { message: string }).message })
  }
})

const PORT = process.env.PORT || 6001
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`)
})
