<div align="center">
<img width=30% src="https://github.com/user-attachments/assets/a92f27b9-5101-4725-8311-a0e6ada0edc7" alt="chat-summarizer-illustration">
</div>

<h1 align="center">Smart Scheduling App</h1>

Smart scheduling app is an assistant tailored for meetings, reminders, and schedules. It is connected with Google Calendar via function calling so you can query and create meetings directly from Rocket.Chat app.

<div align="center" style="margin: 1rem 1rem;">
    <img width=50% src="https://raw.githubusercontent.com/RocketChat/Apps.Smart.Scheduler/refs/heads/main/icon.png" alt="smart-scheduler-app-icon">
</div>

This app is initialized as a part of the Google Summer of Code 2024 program under the Rocket.Chat organization. See the original [project description](https://github.com/RocketChat/google-summer-of-code/blob/main/google-summer-of-code-2024.md).

Contributor: **Maria Khelli** <br>
Mentors: **Sing Li, Devanshu Sharma, and Douglas Gubert**

<h2>Features 🚀</h2>

To fully access the features of the Smart Scheduling App, you need specify variables for the Oauth2.0 as follows.

![image](https://github.com/user-attachments/assets/d7d0ce1c-1cfd-4d04-9793-ab0a114a20eb)

You can find the client ID and client secrets from [Google Cloud Console](https://support.google.com/cloud/answer/6158849).

<div>
    <h3>Feature 1: Ask a question</h3>
    <div align="center" style="margin: 1rem 1rem;">
        <img src="https://github.com/user-attachments/assets/3d78acf8-3f16-4046-b3c8-2f91433ccbec" alt="smart-scheduler-app-icon">
    </div>
</div>

You can ask a question regarding someone's schedule by triggering `/schedule ask [the_question]`

<div>
    <h3>Feature 2: Creating a meeting</h3>
    <div align="center" style="margin: 1rem 1rem;">
        <img src="https://github.com/user-attachments/assets/258e947b-c6ac-44a5-aba3-1f753eafdbce" alt="smart-scheduler-app-icon">
    </div>
</div>

To create a meeting, you have to trigger `/schedule` and a pop up modal will appear. You have to specify the prompt and the participants of the meeting.

If you are not happy with the preference, you can redo it by using `/schedule retry`. However, if you still unsatisfied, you can pick the time manually by using `/schedule pick`.

Example prompt: _Could you arrange a meeting for the next Wednesday? We need to discuss about the new AI projects, and I would prefer an early slot for fresher mind._

<div>
    <h3>Feature 3: Setting a reminder</h3>
    <div align="center" style="margin: 1rem 1rem;">
        <img src="https://github.com/user-attachments/assets/d8db9322-9466-4ee5-a6fe-d0c6f08034b2" alt="smart-scheduler-app-icon">
    </div>
</div>

Setting a reminder is similar to the previous one, you have to trigger `/schedule` and a pop up modal will appear and you have to fill the form. Unlike the previous one, this feature does not care about the schedule of the participants.

Example prompt: _Remind me 23 September 2024 for a GSOC submission at 09.00_

<h2 >How to set up 💻</h2>

<ol>
  <li>Have a Rocket.Chat server ready. If you don't have a server, see this <a href="https://docs.rocket.chat/docs/deploy-rocketchat">guide</a>.</li> 
  <li style="margin-bottom: 1rem;">Install the Rocket.Chat Apps Engline CLI. </li>

```
npm install -g @rocket.chat/apps-cli
```

Verify if the CLI has been installed

```
rc-apps -v
```

  <li style="margin-bottom: 1rem;">Clone the GitHub Repository</li>
    
```
git clone git@github.com:RocketChat/Apps.Smart.Scheduler.git
```
  
<li style="margin-bottom: 1rem;">Install app dependencies</li>
  
```
cd Apps.Smart.Scheduler
npm install
```
  
  <li style="margin-bottom: 1rem;">Deploy the app to the server </li>
  
  ```
  rc-apps deploy --url <server_url> --username <username> --password <password>
  ```
  
  - If you are running the server locally, the default `server_url` is http://localhost:3000.
  - `username` is the username of your admin user.
  - `password` is the password of your admin user.
</ol>

<h2>Additional Notes ✍️</h2>

The development of this app is done using Ollama. If you want to use other API, you might have to change the code accordingly.

<h2>Support us ❤️</h2>

If you like this project, please leave a star ⭐️. This helps more people to know this project.
