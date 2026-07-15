# Merchant Inventory System

An end-to-end inventory platform built to explore API design, workflow automation, and system integration using **n8n**, **PostgreSQL**, and **JavaScript**.

---

## Overview

This project simulates the inventory workflow of a fantasy merchant.

Rather than focusing on a single application, the goal was to build an ecosystem where independent components communicate through a REST API.

The project is divided into three applications working together.

```
                Seed File
                    │
                    ▼
           Merchant Wagon
                    │
              POST /items
                    │
                    ▼
         REST API (n8n Workflow)
                    │
               PostgreSQL
                    │
               GET /items
                    │
                    ▼
              Magic Shop
```

---

## Components

### Merchant Inventory API

The backend of the project.

Built entirely with **n8n**, it exposes REST endpoints responsible for validating requests, communicating with PostgreSQL, and serving inventory data to client applications.

Features:

- REST endpoints
- Request validation
- PostgreSQL integration
- JSON responses
- Modular workflow

---

### Merchant Wagon

A browser-based utility responsible for importing inventory into the API.

Instead of inserting data directly into the database, the Wagon reads a structured seed file and sends every item through the API, simulating deliveries from travelling merchants.

Features:

- Seed parser
- Batch upload
- Preview before import
- API integration
- Error handling

---

### Magic Shop

A frontend consuming the API.

It retrieves inventory in real time and displays the available items inside a fantasy-themed merchant interface.

Features:

- Dynamic inventory
- Live API consumption
- Responsive interface
- Error handling
- RPG-inspired presentation

---

## Technologies

- n8n
- PostgreSQL
- JavaScript
- HTML5
- CSS3
- REST API

---

## Why this project?

The objective wasn't simply to build another CRUD application.

Instead, I wanted to understand how different services communicate while keeping each one responsible for a single task.

This project explores concepts such as:

- API-first architecture
- Workflow automation
- Data pipelines
- Separation of concerns
- Frontend ↔ Backend communication
- Database integration
