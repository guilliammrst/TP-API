# README du Projet
Ce projet est une API simple construite avec Node.js et Express, utilisant la base de données lowdb pour le stockage des données. L'API est conçue pour gérer les utilisateurs, les cours et les inscriptions d'étudiants aux cours.

Créé par : Guilliam MORISSET

## Configuration et Installation

Clonez le dépôt sur votre machine locale:  
`git clone https://github.com/guilliammrst/TP-API.git`

Accédez au répertoire du projet:  
`cd your-repo`

Installez les dépendances:  
`npm install`

Lancez l'application:  
`npm run dev`

Le serveur démarrera sur http://localhost:3000.

## Pour tester le projet

Une collection Postman est mise à disposition sous le nom de `TP-API.postman_collection.json` pour effectuer les tests des routes.
## Structure du Projet

La structure du projet est organisée comme suit :
- app.ts: Le fichier principal de l'application contenant la configuration du serveur Express, les routes et les middlewares.
- db.json: Fichier JSON utilisé comme une base de données simple avec des données initiales pour les utilisateurs, les cours et les inscriptions d'étudiants.

## Points d'Accès de l'API

Utilisateurs
- GET /users: Récupérer la liste des utilisateurs (Rôle Admin requis).
- POST /users: Ajouter un nouvel utilisateur (Rôle Admin requis).

Cours
- GET /courses: Récupérer la liste des cours (Rôle Admin requis).
- POST /courses: Ajouter un nouveau cours (Rôle Admin requis).

Inscriptions d'Étudiants
- GET /studentcourses: Récupérer la liste des inscriptions d'étudiants (Rôle Admin requis).
- POST /studentcourses: Inscrire un étudiant à un cours (Rôle Admin requis).
- PATCH /sign-course: Signer la présence à un cours (Rôle Étudiant requis).

### Authentification  
L'API utilise l'authentification basique pour l'accès des utilisateurs. Les Admins ont accès à tous les points d'accès, tandis que les étudiants peuvent seulement signer leur présence aux cours.

### Validation des Données
L'entrée des données est validée en utilisant la bibliothèque yup. L'API vérifie et assure la correction des données d'utilisateur, de cours et d'inscription d'étudiant avant le traitement.