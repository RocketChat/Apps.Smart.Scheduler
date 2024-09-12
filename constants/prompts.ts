export const PREFERRED_DATETIME_PROMPT = `
You are an assistant who will help people to answer questions based on the prompt. Use provided information, guide, and example to answer the questions. Answer it only concisely. These are the questions you have to answer:
Q1: When is the date? 
Q2: What is the preferred time? 

User prompt: {prompt}

# Guide to answer Q1
Use this list to determine the preferred date. First item refers to tomorrow. Second item refers to the day after tomorrow. It goes so on and so forth until the next 14 days.
{days}

# Guide to answer Q2
- If time is specified, answer with the specified time.
- People usually start working at 09:00 and end at 18:00.
- "Early slot" is before lunch (09:00-12:00). 
- Anything that says "morning" is before lunch (09.00-12.00).
- Lunch break is at 13:00, so "post-lunch" is 13.00-18.00.
- Anything with "afternoon" is after lunch (13:00-18:00). If people say "early afternoon," it means 13:00-15:00. If it is "late afternoon," then it is 15:00-18:00.
- No meeting before 9:00 or after 18:00.

# Examples
Here are the examples that you can use to answer the questions.

## Example 1
Prompt:
Given today is Thursday, 2024-08-01. Schedule a brainstorming session with @john and @alice for next Tuesday. We need to discuss the new project timeline. Late morning is preferable.

Answers:
Q1: 2024-08-06
Q2: Late morning (11:00-12:00)

## Example 2
Prompt:
Given today is Friday, 2024-07-12. Arrange a client meeting with @emma and @mike for next Wednesday. The meeting should be in the early afternoon.

Answers:
Q1: 2024-07-17
Q2: Early afternoon (13:00-14:00)

## Example 3
Prompt:
Given today is Monday, 2024-11-04. Organize a review session with @david and @sarah for the upcoming Thursday. Preferably, the meeting should take place mid-morning.

Answers:
Q1: 2024-11-07
Q2: Mid-morning (10:00-11:00)

## Example 4
Prompt:
Given today is Wednesday, 2024-03-20. Set up a catch-up call with @james and @linda for the following Monday. The meeting time should be early morning.

Answers:
Q1: 2024-03-25
Q2: Early morning (08:00-09:00)

## Example 5
Prompt:
Given today is Tuesday, 2024-09-10. Plan a team lunch with @steve and @nina for next Friday. The lunch should be from 12.00 to 13.00.

Answers:
Q1: 2024-09-13
Q2: Specified (12:00-13:00)

## Example 6
Prompt:
Given today is Monday, 2024-05-06. Schedule a project kickoff meeting with @kate and @alex for today. Aim for the meeting to be in the late afternoon.

Answers:
Q1: 2024-05-06
Q2: Late afternoon (15:00-16:00)
`;

export const RECOMMENDED_COMMON_TIME_PROMPT = `
You are a helpful assistant who will help people to find the best time to meet. We find several common times for participants to meet. 

Context:
{prompt}
1. What is the topic of the meeting? 

Based on the context, choose one of the common times below.
{common_time}
Determine the following: 
2. The email participants who can attend the meeting,
3. The time that is suitable for all participants, and
4. The duration of the meeting. Do not exceed max durations.

No need reasoning. Just answer as concise as possible.
`;

export const CONSTRAINT_ARGS_PROMPT = `
Based on this prompt:
{prompt}
Extract the following arguments:
{
    "preferredDate": "2021-12-31", // YYYY-MM-DD
    "timeMin": "09:00:00", // HH:MM:SS
    "timeMax": "17:00:00", // HH:MM:SS
}`;

export const MEETING_ARGS_PROMPT = `
Based on this prompt:
{prompt}
Extract the following arguments:
{
    "meetingSummary": "string", // Topic of the meeting  
    "participants": ["email@example.com", "second.email@example.com"], // Array of emails
    "datetimeStart": "2021-12-31T09:00:00Z", // Meeting start. Use ISO 8601 format
    "datetimeEnd": "2021-12-31T17:00:00Z", // Meeting end. Use ISO 8601 format
}
`;

export const ASK_FUNCTION_CALL_PROMPT = `
[AVAILABLE_TOOLS] 
[
    {
        "type": "function", 
        "function": {
            "name": "getPeopleSchedule", 
            "description": "Call the Google Calendar API to check the schedule of the people", 
            "parameters": {
                "type": "object", 
                "properties": {
                    "usernames": {
                        "type": "array", 
                        "items": {
                            "type": "string",
                            "description": "The username of the people to check the schedule"
                        }
                    },
                    "date": {
                        "type": "string", 
                        "description": "The date to check the schedule"
                    },
                }, 
                "required": [
                    "usernames", 
                    "date"
                ]
            }
        }
    }
]
[/AVAILABLE_TOOLS]
[INST]
Based on this prompt:
{prompt}
Determine which function to call and provide the arguments. Use the following format:
{
    "functionName": <function_name>,
    "arguments": {
        <argument_name>: <argument_value>,
        <argument_name>: <argument_value>    
    }
}
If you need information about date, use the following list. First item refers to tomorrow. Second item refers to the day after tomorrow. It goes so on and so forth.
{days}
[/INST]
`;
