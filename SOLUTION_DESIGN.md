# Solution Design

Answer each question in 200-400 words. We're looking for clear architectural thinking, production-readiness awareness, and practical decision-making. Diagrams are welcome but not required — clear writing is enough.

---

## Question 1: Production LLM Architecture

The mock LLM needs to be replaced with a production LLM service (e.g., OpenAI, Anthropic, or self-hosted). The system will serve 500+ concurrent users making AI-powered requests.

**Design the production architecture. Address:**

- How would you manage API keys and rate limits across multiple LLM providers?
- What caching strategy would you use? When is it safe to cache LLM responses, and when isn't it?
- How do you handle LLM service outages or degraded performance? What's the fallback behavior?
- How would you manage cost — what controls prevent a runaway API bill?
- How would you observe and monitor LLM quality in production (latency, accuracy, cost per request)?
- If you needed to swap LLM providers (e.g., move from OpenAI to Anthropic), how does your architecture support that?

**Your answer:**

-API keys would be managed by a secrets manager of some sort. Such as Keyvault on Azure. 
-Caching would depend on context. Data that is changed frequently can't be cached as well as data that remains consistant. My code actually includes a mock caching system in place. I chose to cache categorization with a 7 day expiration because this shouldn't ever change as long as we are inputting the same data. Prioritization is cached at once per hour. It changes but not that frequently. Project summary is not cached. Task statuses can change multiple times a day. And we want the latest information. These choices were made with the assumption that the data inserted into it would be far more complicated than just states on a table. Otherwise why would you need an AI? Just write a few if statements. AI integration should be used for gathering information from complex sources. Like perhaps daily standup transcripts would be used to determine the statuses of tasks and help with the summarization.
-Most major LLM providers have some sort of unreachable or timeout error. If we get this error we fail loud and inform the user to try again later. The ticket system should be setup so a AI only enables humans to work faster but it doesn't take away their control. They should be able to continue working without the AI.
-Rate limiters on our API to prevent multiple short burst requests from the same person at the same time. Caching to prevent multiple LLM requests on data that is unlikely to change. Depending on the LLM provider we would either get a hard 429 error when we hit the limit or we they would just let us keep racking up those overage charges. We may need to actually phsyically keep track of our total LLM requests to make sure we stay in our limits. And setup any budget notification features the LLM API may provide to warn us if we are close to or over our limit. 
-I included a mock logger in my code. It logs observable data such as latency and token costs to help us track and adjust as needed. As for accuracy we can measure this by checking how many times the human received AI suggestions and accepted it and how many times they rejected it and wrote something else in its place. 
-From the very start of this project I recognized the need for a Hexagonal architecture. AKA Ports and Adapters. This architecture allows us to separate out our llm service. Its only concern is sending data to the LLM and sending it back. We also have the llm service accepting JSON scehmas. In most APIs these schemas allow us to enforce contracts in the AI responses to keep the response consistantly parseable. Our mock llm doesn't have this service so we instead just inject the schema directly into the prompt. But the point is it should be very easy to swap out llm.ts with other vendor specific scripts without any changes to the core layers of the app.

---

## Question 2: Security & Compliance Architecture

A government client wants to deploy this task tracker with sensitive data. The system must meet FedRAMP Moderate or equivalent security requirements.

**Design the security architecture. Address:**

- Authentication and authorization — how would you implement role-based access control (RBAC)? What roles and permissions make sense for this application?
- Data protection — encryption at rest and in transit, PII handling, data retention policies
- Audit logging — what events do you log, what's the schema, how do you ensure logs are tamper-resistant?
- The AI features process user-generated task descriptions through an LLM — what are the data privacy implications? How do you prevent sensitive data from leaking to the LLM provider?
- How would you handle data residency requirements (data must stay in specific geographic regions)?

**Your answer:**
-Users would need to login with MFA and have an expiring session stored on a JWT token that gets paired with a private token on the API end in order to access our API. You'd probably have roles for developers, managers, and product owners. For the sake of simplicity and considering our current app is actually pretty simple as well for now I'd probably just have developers and managers. Developers would be able to categorize and prioritize work because that's the sort of information they'd need to utilize in their work. Managers would be able to do both of those and summarize the status of a project. 
-I'll be totally honest. Encrpytion isn't my strong suit here and I would need more time to research the right ways to do this. I could just spit back what the AI has told me... TLS in transit, managed database encryption at rest, data minimization in prompts, but about the only part of that I really have a solid grasp on is dataminimization in prompts. Keep prompt data clean and only what it needs to know for the task. But this is not a subject I speak with a lot of authority on and would need to research.
-For the AI integration parts I would log the prompt we send to the LLM, the response, and whatever errors we get in the process. In general it's a good idea to log entry and exit points as your data moves through systems to watch as the data shapes and shifts and goes through the process. You also want to log whenever the system catches an error.
-Services under our control we can ensure are all spun up on US servers on our cloud. For external sources such as the LLM we need to make sure we choose vendors that will gaurantee US only servers. We can also choose to host the model on our own cloud infrastructure.


---

## Question 3: System Design at Scale

The application has grown to 100,000 projects and 5 million tasks across 10,000 users. The current architecture (single Next.js app + single PostgreSQL instance) is struggling.

**How would you re-architect the system? Address:**

- Database strategy — read replicas, sharding, partitioning, or something else? How do you decide?
- Would you extract any services? What would a microservices (or service-oriented) architecture look like for this app?
- How would you handle the AI workloads differently from the CRUD workloads?
- What would your deployment and infrastructure look like (assume AWS or equivalent)?
- How do you handle zero-downtime deployments and database migrations at this scale?

**Your answer:**

-When optimizing databases usually the first thing you look for is indexes. And usually you index high cardinality columns that are in large and difficult to process queries. Anything with a lot of unique values in it. Like First/Last Name. Email address. Soc#. ETC. Read replicas are a solution when you have lots of reads on a database. You essentially clone the database to a separate location and setup infrastructure so both databases are synced to one another. Then when a read comes in you load balance to determine which database server gets the read. Sharding is what you do when you have a massive number of entries into a table. You clone the table and split up the data. So instead of a Mammals table you might have a MammalsA-L and a MammalsM-Z. This helps speed up write times. But can make reading and sorting more complicated. Partitioning is when your table has a ton of columns and often only pieces of those columns are used at any given time. You split the table up into many tables. This makes querying for the individual pieces faster and also helps with code readability and maintainability. You can also utilize caching to help with data that doesn't change often. Like we did in our LLM service.
-The obvious separation is the AI. The task management system is complicated enough as it is. If you separate the LLM features out into its own microservice then you can scale that side much easier without having to worry about any sort of data retention like a database. And the task management system will never need to worry about the AI side of things. This would be a better structure that would help keep both projects more manageable. 
-CRUD workflows are very straight forward. Take this data, Create it, update it, Delete it. It's all very predictable and there is a clear testable state of functionality that can easily be tested. AI workloads are naturally unpredictable. The same prompt can get two different responses completely. For AI to be most useful it needs plenty of guardrails, prompt engineering, and context so the responses are consistent enough to build around.
-Deployment infrastructure would be a transform script that would run all our test suites and link checks, and compile our code before making any deployment. Then it would deploy our code changes. Then our code. We would have separate environments like dev/QA/Staging/Prod to allow us to fully test the app at multiple stages of complexity before it arrives at Prod.
-We would have a backup deployment ready in case the new deployment fails once its live. So we can easily roll back. Database migrations would be backwards compatible ensuring new columns are nullable or at least have a default value. And we fully test that data is not used in the code before deleting. 

---

## Notes

Add any additional notes about your implementation here — design decisions, trade-offs you made, things you'd do differently with more time, etc.

**Your notes:**
1. I want to be fully transparent that I used AI to assist me. Most of the API was done using Claude chat mode. I conversed with Claude and manually copy and pasted suggestions over. The architecture and design choices came from me though. For fully transparency I've included the Claude transcript in my docs folder. I handled the UI using Agentic code. Otherwise my version probably wouldn't have looked as pretty and probably would have taken a lot longer. I am capable of understanding front end and working in it. But I'm not a designer. I did my best to ensure it looked professional and I took the time to ensure everything behaved as I expected. I included my spec file in the docs.

2. With more time I would like to get into better prompt engineering. I'd love to see what we can put together. Maybe a RAG system that pulls relevant documents and meeting transcripts to make better categorization and prioritization choices. I'm just really hopeful to work more with AI integration.

3. Hexagonal Architecture was an active choice I made from the very begining. Knowing AI is volitile and the tech is changing all the time it made sense that an AI integration would be easily swappable. So this style made the mode sense to me.

4. Beyond the base requirements I also added mock logging and caching systems so you can see some of my thoughts on those in action.

5. Areas for growth: My knowledge of encryption particularly around federal government standards is not great. Just haven't had a lot of opportunity to dive that deep into security knowledge. But I'm excited to learn. In fact any gap you may find is an opportunity to learn. I'm an engineer at heart. Give me a problem and I'm here to solve it.