import express, { Request, Response } from 'express';
import low, { LowdbSync } from 'lowdb';
import FileSync from 'lowdb/adapters/FileSync';
import bodyParser from 'body-parser';
import * as yup from 'yup';
import moment from 'moment'; 

// Base de données JSON
const adapter = new FileSync('db.json');
const db: LowdbSync<any> = low(adapter);

// Initialisation de la base de données avec un utilisateur admin par défaut si aucun utilisateur n'existe
if (!db.has('users').value()) {
    db.defaults(
      { 
        users: [
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
        ],
        courses: [
          {
            "id": 1,
            "title": "Cours1",
            "date": "11/11/2021 11:11:11",
          },
          {
            "id": 2,
            "title": "Cours2",
            "date": "11/11/2021 11:11:11",
          }
        ]
      }
      ).write();
  }

// Schéma de validation Yup pour l'utilisateur
const userSchema = yup.object({
    email: yup.string().email().required(),
    password: yup.string().required(),
    role: yup.string().oneOf(['admin', 'student']).required(),
  });

  // Validation des données du cours
  const courseSchema = yup.object({
    title: yup.string().required(),
    date: yup.string().matches(/^\d{2}\/\d{2}\/\d{4} \d{2}:\d{2}:\d{2}$/, 'Le format de la date doit être "MM/dd/yyyy HH:mm:ss"')
    .transform((originalValue, originalObject) => {
      const formattedDate = moment(originalValue).format('MM/DD/YYYY HH:mm:ss');
      return formattedDate;
    }),
  });


const app = express();
const port = 3000;

// Middleware pour traiter le corps des requêtes au format JSON
app.use(bodyParser.json());

app.get('/users', (req: Request, res: Response) => {
  const users = db.get('users').value();
  res.json(users);
});

// Endpoint pour ajouter un utilisateur
app.post('/users', async (req: Request, res: Response) => {
  const { adminEmail, adminPassword, email, password, role } = req.body;

  try {
    if (!adminEmail || !adminPassword) {
        throw new Error('Il manque adminEmail et/ou adminPassword.');
    }

    const users = db.get('users').value();

    const userIndex = users.findIndex((u: any) => u.email === adminEmail && u.password === adminPassword && u.role === 'admin');

    if (userIndex === -1) {
        throw new Error('adminEmail n\'a pas les droits pour effectuer cette action ou mot de passe incorrect.');
    }

    const newUserIndex = users.findIndex((u: any) => u.email === email);

    if (newUserIndex !== -1) {
        throw new Error('Email déjà utilisé.');
    }

    // Validation des données avec Yup
    await userSchema.validate({ email, password, role });

    // Récupération de la dernière personne dans la base de données
    const lastUser = users[users.length - 1];
    const id = lastUser ? Number(lastUser.id) + 1 : 1;

    // Ajout de l'utilisateur à la base de données de manière atomique
    db.update('users', (users: any[]) => users.concat({ id, email, password, role })).write();

    res.status(201).json({ id, email, role });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

app.get('/courses', (req: Request, res: Response) => {
  const courses = db.get('courses').value();
  res.json(courses);
});

// Endpoint pour ajouter un cours (seulement accessible par les administrateurs)
app.post('/courses', async (req: Request, res: Response) => {
  const { adminEmail, adminPassword, title, date } = req.body;

  try {
    if (!adminEmail || !adminPassword) {
      throw new Error('Il manque adminEmail et/ou adminPassword.');
    }

    const users = db.get('users').value();

    const adminIndex = users.findIndex((u: any) => u.email === adminEmail && u.password === adminPassword && u.role === 'admin');

    if (adminIndex === -1) {
      throw new Error('adminEmail n\'a pas les droits pour effectuer cette action ou mot de passe incorrect.');
    }

    await courseSchema.validate({ title, date });

    const courses = db.get('courses').value();

    // Récupération de la dernière personne dans la base de données
    const lastCourse = courses[courses.length - 1];
    const courseId = lastCourse ? Number(lastCourse.id) + 1 : 1;

    // Ajout du cours à la base de données de manière atomique
    db.update('courses', (courses: any[]) => courses.concat({ id: courseId, title, date })).write();

    res.status(201).json({ id: courseId, title, date });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

app.listen(port, () => {
  console.log(`Server is running at http://localhost:${port}`);
});