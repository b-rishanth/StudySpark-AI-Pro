# ✨ StudySpark AI Pro

## AI-Powered Exam-Ready Study Assistant

StudySpark AI Pro is an AI-powered educational platform that transforms any academic topic into structured, exam-oriented study material.

The application helps engineering and university students quickly prepare for exams by generating detailed notes containing:

- 📖 Summary
- 🎯 Learning Objectives
- ⭐ Key Concepts
- 🧠 Visual Explanation
- 📊 Comparison Tables
- 💡 Memory Tricks
- 🌍 Real-Life Examples
- ✅ Advantages
- ❌ Disadvantages
- 🎤 Viva Questions
- 📚 Anna University 16-Mark Notes
- 🧠 Quiz Questions
- 📄 References


---

# 🌐 Live Demo

🚀 Deployed Application:

https://st-97429f0d16bd478ba9c66c5a2b1a562b.ecs.ap-south-1.on.aws/


---

# 🚀 Features

## 🤖 AI Study Generation

Users can enter any academic topic and instantly generate complete exam-ready study notes using Artificial Intelligence.

Powered by:

- Groq API
- llama-3.3-70b-versatile Large Language Model


---

## 📚 Smart Note Organization

Generated content is automatically structured into separate sections for easy reading and revision.

The generated notes include:

- Concept explanations
- Tables
- Diagrams
- Viva preparation
- Long-answer exam format


---

## 📝 History Management

StudySpark AI Pro stores previous generated topics locally.

Features:

- Save previous topics
- Search history
- Rename notes
- Pin important topics
- Delete history


---

## 📤 Export Options

Students can export generated notes as:

- PDF
- TXT
- Markdown
- Clipboard copy


---

## 🔊 Voice Learning

The application supports audio-based learning using the browser Speech Synthesis API.

Students can listen to generated notes instead of only reading.


---

## 🎨 Modern Responsive Interface

The application provides a clean and responsive user experience.

Supported devices:

- Desktop
- Laptop
- Tablet
- Mobile


---

# 🏗️ System Architecture


```
User Browser
      |
      |
Frontend
(HTML + CSS + JavaScript)
      |
      |
REST API Request
      |
      |
Node.js + Express Backend
      |
      |
Groq API
(llama-3.3-70b-versatile)
      |
      |
Generated Study Notes
      |
      |
Displayed to User
```


---

# 🛠️ Technology Stack

## Frontend

- HTML5
- CSS3
- JavaScript
- Responsive UI
- LocalStorage


## Backend

- Node.js
- Express.js
- REST API


## Artificial Intelligence

- Groq API
- llama-3.3-70b-versatile


## Containerization

- Docker
- Node.js Alpine Image


## Cloud Deployment

- Amazon ECS
- Amazon ECR
- AWS CloudWatch Logs


---

# 📁 Project Structure


```
StudySpark-AI-Pro/

│
├── frontend/
│   │
│   ├── index.html
│   ├── style.css
│   └── script.js
│
│
├── backend/
│   │
│   ├── server.js
│   ├── package.json
│   └── .env.example
│
│
├── Dockerfile
├── .dockerignore
├── README.md
└── Project_Report.pdf

```


---

# ⚙️ Running Locally


## Requirements

Install:

- Node.js 18+
- Docker (optional)


---

## Backend Setup


Navigate to backend:


```bash
cd backend
```


Install dependencies:


```bash
npm install
```


Create environment file:


```
.env
```


Add:


```
GROQ_API_KEY=your_api_key_here
```


Start server:


```bash
npm start
```


Application runs on:


```
http://localhost:8080
```


---

# 🔌 API Documentation


## Generate Study Notes


### Endpoint

```
POST /api/generate
```


### Request


```json
{
 "topic":"Computer Networks"
}
```


### Response


```json
{
 "markdown":"Generated study notes",
 "topic":"Computer Networks"
}
```



---

## Health Check


### Endpoint


```
GET /api/health
```


Response:


```json
{
 "status":"ok",
 "model":"llama-3.3-70b-versatile"
}
```


---

# 🐳 Docker Deployment


Build Docker image:


```bash
docker build -t studyspark-ai .
```


Run container:


```bash
docker run -p 8080:8080 studyspark-ai
```


---

# ☁️ AWS ECS Deployment


Deployment workflow:


```
Docker Image
      |
      |
Amazon ECR
      |
      |
Amazon ECS Service
      |
      |
Public HTTPS URL
```


AWS Services Used:

- Amazon ECS
- Amazon ECR
- CloudWatch Logs
- IAM Roles
- Security Groups


---

# 🔐 Security Features


Implemented security practices:

- API key stored only on backend
- Frontend never exposes API credentials
- Environment variables used for secrets
- API request validation
- Rate limiting protection


---

# 🧪 Testing


Verified features:

✅ AI note generation  
✅ API health check  
✅ History management  
✅ Export functions  
✅ Responsive design  
✅ Docker deployment  
✅ AWS ECS deployment  
✅ Cloud API communication  


---

# 🔮 Future Improvements


Possible enhancements:

- User authentication
- Database storage
- Personalized learning paths
- Multiple AI model support
- Mobile application
- AI-generated diagrams
- Student progress tracking


---

# 👨‍💻 Project Information


**Project Name:** StudySpark AI Pro  

**Category:** Artificial Intelligence + Full Stack Web Application  

**Deployment:** AWS ECS  

**AI Model:** llama-3.3-70b-versatile  

**Backend:** Node.js + Express  

**Container:** Docker  


---

# 📄 License


MIT License

Free to use, modify, and improve for educational purposes.