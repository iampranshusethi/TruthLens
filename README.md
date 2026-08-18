# TruthLens

### Domain-Adaptive, Evidence-Driven Document Intelligence

TruthLens is an AI-powered document analysis and comparison system built to make complex policies, contracts, and Terms & Conditions more transparent, explainable, and easier to evaluate.

Instead of simply summarizing a document, TruthLens analyzes its language, identifies potential issues, extracts supporting evidence, and, when comparing multiple documents, evaluates them against the user's specific goals and priorities.

🏆 **Runner-Up, IIITA × Eudia AI-ML Hackathon**
💰 **₹40,000 Cash Prize**

## What TruthLens Does

TruthLens is built around two complementary analysis engines.

### 1. Single-Document Analysis

The first engine performs structured analysis of an individual document and evaluates:

* Bias
* Tone
* Manipulative language
* Legal clarity
* Potential areas of concern
* Suggested improvements
* Overall summary

The system converts the LLM's reasoning into a structured output rather than displaying an unstructured response. Each finding is accompanied by a justification so users can understand why the system reached a particular conclusion.

### 2. Multi-Document Comparison

The second engine allows users to upload multiple policies or contracts and compare them according to their own requirements.

The user first specifies their objective and priorities. TruthLens then adapts its reasoning according to the document domain, such as:

* Insurance policies
* Rental agreements
* Employment contracts
* Other contractual documents

Documents are evaluated across dimensions such as fairness, cost, coverage, and transparency. The system then produces a comparative verdict supported by document-level evidence and reasoning.

The important distinction is that the comparison is not simply "Document A is better than Document B." The evaluation is conditioned on what the user actually cares about.

## Evidence-Driven Reasoning

A core design principle of TruthLens is:

> A conclusion should be supported by evidence from the document.

For comparisons, the system extracts relevant clauses and uses them as supporting evidence for scores, pros, cons, and the final verdict.

This makes the output easier to inspect and reduces reliance on unsupported LLM-generated claims.

## Domain-Adaptive Reasoning

Different documents require different evaluation criteria.

For example, the important considerations when comparing two insurance policies are very different from those involved in comparing employment contracts.

TruthLens therefore incorporates the document domain and user intent into the reasoning process rather than applying the same generic evaluation prompt to every document.

## Technical Architecture

TruthLens uses a lightweight client-server architecture.

**Frontend**

* HTML
* CSS
* JavaScript
* PDF.js for client-side PDF text extraction
* Responsive document analysis interface
* Interactive scoring and comparison visualizations

**Backend**

* Python
* Flask
* REST API architecture
* OpenRouter API for LLM inference
* Structured JSON-based communication between frontend and backend

### Core API Endpoints

`POST /analyze`

Processes a single document and returns structured analysis across bias, tone, manipulation, and legal clarity.

`POST /compare`

Processes multiple documents together with user intent and priority weights, producing document-level scores, evidence, and a comparative verdict.

`POST /chat`

Provides context-aware follow-up questions based on the most recent analysis or comparison.

## LLM Output Structuring

Because LLM responses are inherently probabilistic, TruthLens does not directly render raw model responses.

The backend uses structured prompting and JSON extraction/normalization to convert model output into a predictable schema that the frontend can safely consume.

The pipeline therefore looks approximately like:

`Document → Text Extraction → Domain + Intent → LLM Reasoning → Structured JSON → Validation → UI`

This separation between reasoning and presentation makes the system easier to debug, extend, and integrate with other interfaces.

## Document Processing

TruthLens supports `.txt` and `.pdf` documents.

PDF files are processed through PDF.js, allowing their text content to be extracted before being passed into the analysis pipeline.

The comparison engine also performs lightweight document statistics such as word count, sentence count, estimated readability/clarity, and keyword detection to provide an initial overview before deeper analysis.

## Explainability

TruthLens is designed around explainability rather than treating the LLM as a black box.

Instead of only returning a numerical score, the system attempts to expose:

* What was detected
* Why it was detected
* Which part of the document supports the finding
* How different documents compare
* Why a particular document was selected as the winner
* What caveats remain

This makes the system particularly suited to document-heavy decision workflows where users need to understand the reasoning behind an AI-generated recommendation.

## Follow-Up Analysis

After an analysis or comparison, users can interact with TruthLens through a contextual chat interface.

The backend retains the most recent structured result and uses it as context for follow-up questions, allowing users to ask for clarification without rerunning the entire analysis.

## Tech Stack

| Layer               | Technology            |
| ------------------- | --------------------- |
| Frontend            | HTML, CSS, JavaScript |
| Backend             | Python, Flask         |
| LLM                 | LLaMA via OpenRouter  |
| Document Processing | PDF.js                |
| Communication       | REST APIs / JSON      |
| Report Generation   | html2pdf.js           |

## Why TruthLens?

Most document AI tools focus primarily on summarization.

TruthLens approaches the problem as a decision-support system: understand the document, identify relevant information, evaluate it against a defined objective, expose supporting evidence, and communicate the reasoning in a structured format.

The long-term vision is to extend this approach into contract review, insurance comparison, procurement, compliance, and other workflows where people have to make decisions based on dense textual information.

## Hackathon

TruthLens was developed for the **IIITA × Eudia AI-ML Hackathon** and was awarded **Runner-Up**, receiving a **₹40,000 cash prize**.

The project was built as a rapid, end-to-end prototype under hackathon constraints, covering the AI reasoning pipeline, document processing, backend APIs, frontend interface, comparison logic, and reporting workflow.

## Future Directions

Potential future improvements include:

* Formal evaluation against legal NLP benchmarks and annotated datasets
* More robust clause-level retrieval and citation
* Larger-document processing through intelligent chunking and retrieval
* Persistent document workspaces
* Human-in-the-loop review
* Domain-specific evaluation models
* More rigorous calibration of scoring systems
* Enterprise integrations for compliance and contract workflows

---

**TruthLens: Turning complex documents into transparent, evidence-backed decisions.**
