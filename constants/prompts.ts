export const PREFERRED_DATETIME_PROMPT = `
You are an assistant who will help people to answer questions based on the prompt. Use provided information, guide, and example to answer the questions. Answer it only concisely. These are the questions you have to answer:
Q1: When is the date? 
Q2: What is the preferred time? 

User prompt: {prompt}

# Guide to answer Q1
Use this list to determine the preferred date. First item refers to tomorrow. Second item refers to the day after tomorrow. It goes so on and so forth until the next 14 days.
{days}

# Guide to answer Q2
- People usually start working at 09:00 and end at 18:00.
- Early slot is usually before lunch (09:00-12:00). 
- Anything that says "morning" is before lunch (09.00-12.00).
- Lunch break is at 13:00, so "post-lunch" is 13.00-18.00.
- Anything with "afternoon" is after lunch (13:00-18:00). If people say "early afternoon," it means 13:00-15:00. If it is "late afternoon," then it is 15:00-18:00.

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
Given today is Tuesday, 2024-09-10. Plan a team lunch with @steve and @nina for next Friday. The lunch should be around midday.

Answers:
Q1: 2024-09-13
Q2: Midday (12:00-13:00)

## Example 6
Prompt:
Given today is Monday, 2024-05-06. Schedule a project kickoff meeting with @kate and @alex for today. Aim for the meeting to be in the late afternoon.

Answers:
Q1: 2024-05-06
Q2: Late afternoon (15:00-16:00)
`;

export const COMMON_TIME_PROMPT = `
You are a scheduling assistant who will help a group of people to find suitable meeting time for them. The definitions of free time are
1. Time between busy schedule, 
2. Office hour start to the first busy schedule, or 
3. Last busy schedule to end of office hours.

Based on this prompt:
{prompt}

What is their common free time? Remember to prioritize the one inside the preferred time. Remember common time should not overlap with anyone's busy time.

### This is an example ###
Prompt:
General Constraint
- Preferable from 2021-12-30T01:00:00Z to 2021-12-30T04:00:00Z

Me
- Busy from 2021-12-30T02:00:00Z to 2021-12-30T02:30:00Z
- Busy from 2021-12-30T07:00:00Z to 2021-12-30T07:30:00Z
- Office hours from 2021-12-30T01:00:00Z to 2021-12-30T09:00:00Z

James
- Busy from 2021-12-30T04:00:00Z to 2021-12-30T05:00:00Z
- Busy from 2021-12-30T08:30:00Z to 2021-12-30T09:00:00Z
- Office hours from 2021-12-30T01:00:00Z to 2021-12-30T09:00:00Z

Sarah
- Busy from 2021-12-30T03:00:00Z to 2021-12-30T03:30:00Z
- Busy from 2021-12-30T05:00:00Z to 2021-12-30T05:30:00Z
- Busy from 2021-12-30T08:00:00Z to 2021-12-30T08:30:00Z
- Office hours from 2021-12-30T02:00:00Z to 2021-12-30T10:00:00Z

## Guide and steps to answer:
1. Determine everyone's schedule 
- Your Schedule:
Busy from 02:00 to 02:30
Busy from 07:00 to 07:30
Office hours from 01:00 to 09:00
- James's Schedule:
Busy from 04:00 to 05:00
Busy from 08:30 to 09:00
Office hours from 01:00 to 09:00
- Sarah's Schedule:
Busy from 03:00 to 03:30
Busy from 05:00 to 05:30
Busy from 08:00 to 08:30
Office hours from 02:00 to 10:00

2. List out common free time within the preferable time.
You: 01:00 to 02:00, 02:30 to 03.00, 03.00 to 03.30, 03.30 to 04:00
James: 01:00 to 04:00
Sarah: 02:00 to 03:00, 03:30 to 04:00

3. Prioritize the timeslot where everyone is free. Within the preferable timeframe of 01:00 to 04:00, the common free slots are:
02:30 to 03:00
03:30 to 04:00

Notes: If the preferable time is not available for everyone, use time outside preferable timeframe as long as everyone can join. Otherwise, do not include the one outside preferred time. Only include the one inside preferred time.

4. Pick the ones within preferable time. 
Common free times for all of you available and inside the preferred time (01:00:00Z to 04:00:00Z) are
- 02:30:00Z to 03:00:00Z
- 03:30:00Z to 04:00:00Z
Exclude that is not ideal.

Answer:
- 02:30:00Z to 03:00:00Z
- 03:30:00Z to 04:00:00Z
### End of example ###
`;
