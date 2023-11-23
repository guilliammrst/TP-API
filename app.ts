import express, { Request, Response } from 'express';
import low, { LowdbSync } from 'lowdb';
import FileSync from 'lowdb/adapters/FileSync';
import bodyParser from 'body-parser';
import * as yup from 'yup';
import moment from 'moment'; 
import basicAuth from 'express-basic-auth';

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
        ],
        studentcourses: [
          {
            "id": 1,
            "studentId": 2,
            "courseId": 2,
            "registeredAt": "11/11/2011 01:51:11",
            "signedAt": null
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

  const studentCourseSchema = yup.object({
    studentId: yup.number().required(),
    courseId: yup.number().required(),
    registeredAt: yup.string().matches(/^\d{2}\/\d{2}\/\d{4} \d{2}:\d{2}:\d{2}$/, 'Le format de la date doit être "MM/dd/yyyy HH:mm:ss"')
    .transform((originalValue, originalObject) => {
      const formattedDate = moment(originalValue).format('DD/MM/YYYY HH:mm:ss');
      return formattedDate;
    }),    
    signedAt: yup.string().matches(/^\d{2}\/\d{2}\/\d{4} \d{2}:\d{2}:\d{2}$/, 'Le format de la date doit être "MM/dd/yyyy HH:mm:ss"').nullable()
    .transform((originalValue, originalObject) => {
      const formattedDate = moment(originalValue).format('MM/DD/YYYY HH:mm:ss');
      return formattedDate;
    }), 
  });

const app = express();
const port = 3000;

const users = db.get('users').value();
const courses = db.get('courses').value();
const studentCourses = db.get('studentcourses').value();

// Middleware pour traiter le corps des requêtes au format JSON
app.use(bodyParser.json());

const basicAuthUsers = users.reduce((acc: { [key: string]: string }, user: any) => {
  acc[user.email] = user.password;
  return acc;
}, {});

app.use(basicAuth({
  users: basicAuthUsers,
  challenge: true,
  unauthorizedResponse: 'Nom d\'utilisateur ou mot de passe incorrect',
}));

app.use((req: any, res, next) => {
  
  const authenticatedUser = users.find((u: any) => u.email === req.auth.user);
  if (authenticatedUser) {
    req.user = authenticatedUser;
  }
  next();
});

function checkRole(role: string) {
  return (req: any, res: any, next: any) => {
    if (req.user.role !== role) {
      return res.status(403).send({ message: 'Accès refusé' });
    }
    next();
  };
}

app.get('/users', checkRole('admin'), (req: Request, res: Response) => {
  res.json(users);
});

// Endpoint pour ajouter un utilisateur
app.post('/users', checkRole('admin'), async (req: Request, res: Response) => {
  const { email, password, role } = req.body;

  try {
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

app.get('/courses', checkRole('admin'), (req: Request, res: Response) => {
  res.json(courses);
});

// Endpoint pour ajouter un cours (seulement accessible par les administrateurs)
app.post('/courses', checkRole('admin'), async (req: Request, res: Response) => {
  const { title, date } = req.body;

  try {
    await courseSchema.validate({ title, date });

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

app.get('/studentcourses', checkRole('admin'), (req: Request, res: Response) => {
  res.json(studentCourses);
});

app.post('/studentcourses', checkRole('admin'), async (req: Request, res: Response) => {
  const { studentId, courseId } = req.body;
  const currentDate = new Date();

  // Obtenir les composants de la date
  const month = String(currentDate.getMonth() + 1).padStart(2, '0');
  const day = String(currentDate.getDate()).padStart(2, '0');
  const year = currentDate.getFullYear();
  const hours = String(currentDate.getHours()).padStart(2, '0');
  const minutes = String(currentDate.getMinutes()).padStart(2, '0');
  const seconds = String(currentDate.getSeconds()).padStart(2, '0');

  // Construire la chaîne de date formatée
  const registeredAt = `${month}/${day}/${year} ${hours}:${minutes}:${seconds}`;
  try {
    await studentCourseSchema.validate({ studentId, courseId , registeredAt});

    if (users.findIndex((u: any) => u.id === studentId && u.role === "student") === -1) 
    {
      throw new Error('L\'ID fourni ne correspond pas à un étudiant');
    }

    if (courses.findIndex((c: any) => c.id === courseId) === -1) 
    {
      throw new Error('Cours non trouvé.');
    }

    if (studentCourses.findIndex((sc: any) => sc.studentId === studentId && sc.courseId === courseId) !== -1) 
    {
      throw new Error('L\'étudiant est déjà inscrit à ce cours');
    }

    // Récupération de la dernière personne dans la base de données
    const lastStudentCourse = studentCourses[studentCourses.length - 1];
    const studentCourseId = lastStudentCourse ? Number(lastStudentCourse.id) + 1 : 1;

    // Ajout du cours à la base de données de manière atomique
    db.update('studentcourses', (studentCourses: any[]) => studentCourses.concat({ id: studentCourseId, studentId, courseId, registeredAt, signedAt: null })).write();

    res.status(201).json({ id: studentCourseId, studentId, courseId, registeredAt, signedAt: null });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

app.patch('/sign-course', checkRole('student'), (req: Request, res: Response) => {
  const { courseId } = req.body;

  try{
    const user = (req as any).user;

    let studentCourse = studentCourses.find((sc: any) => sc.studentId === user.id && sc.courseId === courseId);

    if (!studentCourse) {
      throw new Error('Le cours avec cet ID n\'existe pas pour cet étudiant');
    }

    if (studentCourse.signedAt) {
      throw new Error('Le cours a déjà été signé');
    }

    const currentDate = new Date();

    // Obtenir les composants de la date
    const month = String(currentDate.getMonth() + 1).padStart(2, '0'); // Les mois commencent à 0, donc ajout de 1
    const day = String(currentDate.getDate()).padStart(2, '0');
    const year = currentDate.getFullYear();
    const hours = String(currentDate.getHours()).padStart(2, '0');
    const minutes = String(currentDate.getMinutes()).padStart(2, '0');
    const seconds = String(currentDate.getSeconds()).padStart(2, '0');

    // Construire la chaîne de date formatée
    const signedAt = `${month}/${day}/${year} ${hours}:${minutes}:${seconds}`;

    studentCourse.signedAt = signedAt;

    studentCourses[studentCourse] = { ...studentCourses[studentCourse], ...studentCourse };

    db.set('studentcourses', studentCourses).write();

    res.status(200).send({ message: 'Cours signé avec succès' });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

app.listen(port, () => {
  console.log(`Server is running at http://localhost:${port}`);
});