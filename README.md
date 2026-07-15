# CRM System Updates & Feature Enhancement Requirements Lists 

## 1. Settings Module

Move the following modules under the **Workspace** category and improve their UI/UX:

* User Management
* Role Management
* Notifications

  * Move Notifications to the Workspace category.
  * Redesign the UI/UX.
  * Implement real-time notifications with full synchronization.

# Feature Updates

## Task Management

### General Improvements

* Fix the issue where task checkboxes are duplicated.
* Prevent users from creating duplicate tasks with the same name or content.
* Improve validation to avoid duplicate entries.

### Kanban View

Expand the available Kanban statuses to better align with the CRM workflow.

Current Statuses 

* To Do
* Pending
* In Progress
* Cancelled
* Done

Add at least **two additional workflow statuses** and ensure they are fully synchronized with the CRM pipeline.


## Activity Timeline

Redesign the Activity Timeline to clearly display the progress of each pipeline.

Requirements

* Use a modern **left-right alternating timeline card layout**.
* Support smooth scrolling.
* Each timeline card should be clickable to view detailed information.
* When opening a project, users should see the complete activity timeline for that specific project.
* Synchronize the timeline with:

  * CRM Pipeline
  * Deals
* Add the Activity Timeline to the left sidebar for quick access.

## Dashboard

* Synchronize the dashboard with real production data.
* Display real-time statistics, metrics, and analytics instead of placeholder or mock data.

## AI Assistant

* Redesign the entire AI Assistant interface.
* Improve the overall UI/UX for a cleaner and more modern experience.
* Enhance usability and accessibility.


## Theme Improvements

Improve both **Dark Mode** and **Light Mode**.

Current issue

* Some pages still display Light Mode elements when Dark Mode is enabled.

Requirements

* Ensure complete theme consistency across the application.
* All components should properly switch between Dark and Light themes.


# Sidebar Updates

Move or add the following modules to the left sidebar for easier navigation:

* Lead Scoring
* User Management
* Role Management
* Documents Management
* Settings
* Audit Logs

# Administrator Module Updates

## Lead Scoring

* Redesign and improve the UI.

## User Management

* Modernize the UI/UX.
* Improve usability and management workflows.

## Role Management

* Redesign the UI/UX.
* Replace the current permission checklist with a cleaner and more user-friendly permission management interface.
* Make role assignment more intuitive.


## Documents Management

Create a centralized document management system.

Requirements Lists

* Synchronize all uploaded documents from every module.
* Display documents in a single unified location.
* Provide:

  * Table View
  * List View
* Improve the overall UI/UX.
* Enable searching, filtering, and document organization.


## Settings

Redesign the Settings module.

Include Feature

* Improved Profile Settings
* Better account management
* Modern UI/UX across all settings pages
* Better organization of system configurations


## Audit Logs

Redesign the Audit Logs module with a more advanced interface.

Track and display on:

* User login activity
* CRUD operations (Create, Read, Update, Delete)
* IP Address
* Device information
* Browser information
* Activity timestamps
* User actions with filtering and search support
