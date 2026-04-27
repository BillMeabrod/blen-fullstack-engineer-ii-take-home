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



---

## Notes

Add any additional notes about your implementation here — design decisions, trade-offs you made, things you'd do differently with more time, etc.

**Your notes:**
