import express, { Request, Response } from 'express';
import low, { LowdbSync } from 'lowdb';
import FileSync from 'lowdb/adapters/FileSync';
import bodyParser from 'body-parser';
import * as yup from 'yup';

// Base de données JSON
const adapter = new FileSync('db.json');
const db: LowdbSync<any> = low(adapter);

// Initialisation de la base de données avec un utilisateur admin par défaut si aucun utilisateur n'existe
if (!db.has('users').value()) {
    db.defaults({ users: [
        {
            "id": 1,
            "email": "admin@test.com",
            "password": "test",
            "role": "admin"
        },
        {
          "id": 2,
          "email": "student@test.com",
          "password": "test",
          "role": "student"
      },
    ] }).write();
  }

// Schéma de validation Yup pour l'utilisateur
const userSchema = yup.object({
    email: yup.string().email().required(),
    password: yup.string().required(),
    role: yup.string().oneOf(['admin', 'student']).required(),
  });

const app = express();
const port = 3000;

// Middleware pour traiter le corps des requêtes au format JSON
app.use(bodyParser.json());

// Endpoint pour ajouter un utilisateur
app.post('/users', async (req: Request, res: Response) => {
  const { adminEmail, email, password, role } = req.body;

  try {
    const users = db.get('users').value();

    const userIndex = users.findIndex((u: any) => u.email === adminEmail && u.role === 'admin');

    if (userIndex === -1) {
        throw new Error('Vous n\'avez pas les droits pour effectuer cette action.');
    }

    // Validation des données avec Yup
    await userSchema.validate({ email, password, role });

    // Récupération de la dernière personne dans la base de données
    
    const lastUser = users[users.length - 1];

    const id = lastUser ? Number(lastUser.id) + 1 : 1;

    // Ajout de l'utilisateur à la base de données
    const newUser = { id, email, password, role };
    users.push(newUser);

    db.set('users', users).write();

    res.status(201).json(newUser);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

app.listen(port, () => {
  console.log(`Server is running at http://localhost:${port}`);
});