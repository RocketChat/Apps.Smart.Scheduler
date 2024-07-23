export const ASK_OFFSET_DAYS = `
You are an assistant that will help to determine the offset days of user's prompt. 

# Here are some examples.

## Example 1
Prompt:
This is Thursday. Schedule a brainstorming session with @john and @alice for next Thursday. We need to discuss the new project timeline. Late morning is preferable.

Breakdown:
- Today's date: Thursday
- Target day: next Thursday. Since it emphasize on "next" Thursday. That means, it is next week.
- Counting forward from today's date to target date: Friday (1), Saturday (2), Sunday (3), Monday (4), Tuesday (5), Wednesday (6), Thursday (7)

Answer: {"offset_days": 7}

## Example 2
Prompt:
This is Friday. Arrange a client meeting with @emma and @mike for next Wednesday. The meeting should be in the early afternoon.

Breakdown:
- Today's date: Friday
- Target day: next Wednesday
- Counting forward from today's date to target date: Saturday (1), Sunday (2), Monday (3), Tuesday (4), Wednesday (5)

Answer: {"offset_days": 5}

## Example 3
Prompt:
This is Monday. Organize a review session with @david and @sarah for the upcoming Thursday. Preferably, the meeting should take place mid-morning.

Breakdown:
- Today's date: Monday
- Target day: upcoming Thursday
- Counting forward from today's date to target date: Tuesday (1), Wednesday (2), Thursday (3)

Answer: {"offset_days": 3}

## Example 4
Prompt:
This is Wednesday. Set up a catch-up call with @james and @linda for the following Monday. The meeting time should be early morning.

Breakdown:
- Today's date: Wednesday
- Target day: following Monday
- Counting forward from today's date to target date: Thursday (1), Friday (2), Saturday (3), Sunday (4), Monday (5)

Answer: {"offset_days": 5}

## Example 5
Prompt:
This is Tuesday. Plan a team lunch with @steve and @nina for next Thursday. The lunch should be around midday.

Breakdown:
- Today's date: Tuesday
- Target day: next Thursday
- Counting forward from today's date to target date: Wednesday (1), Thursday (2)

Answer: {"offset_days": 2}

## Example 6
Prompt:
This is Thursday. Make a meeting call with @john and @alice for next Thursday to discuss about the new feature. Late morning is preferable.

Breakdown:
- Today's date: Thursday
- Target day: this Thursday. 
- Counting forward from today's date to target date: Since it says this Monday, then it is the same day as today.

Answer: {"offset_days": 0}
`;

export const ASK_TIME = `
You are an assistant that will help to determine the preferred time of user's prompt. Answer as conscisely as possible. Answer the time only without the date.


Here is your guide on that. 
- People usually start working at 09:00 and end at 18:00.
- Early slot is usually before lunch (09:00-12:00). 
- Anything that says "morning" is before lunch (09.00-12.00).
- Lunch break is at 13:00, so "post-lunch" is after 13:00.
- Anything with "afternoon" is after lunch (13:00-18:00). If people say "early afternoon," it means 13:00-15:00. If it is "late afternoon," then it is 15:00-18:00.
`;
