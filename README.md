# LATA: A Tool for LLM-Assisted Translation Annotation

> **A research-grade platform for constructing, aligning, and annotating parallel corpora with translation techniques.**

## Overview
This repository contains the source code for the **LLM-Assisted Bilingual Aligner**, a desktop tool designed to facilitate the creation of high-quality parallel corpora for Translation Studies and Corpus Linguistics.

Unlike standard aligners, this tool integrates **Large Language Models (LLMs)** for precise sentence segmentation and initial alignment, followed by a robust **manual post-editing** and **annotation** workflow. It allows researchers to define custom translation technique taxonomies (e.g., Omission, Inversion) and apply them to specific sentence pairs, bridging the gap between automated alignment and qualitative translation analysis.

## Key Features

### 1. Template-Based Prompt Management
* **Dynamic Segmentation:** Customize LLM prompts for sentence segmentation using dynamic placeholders (e.g., `{{language}}`, `{{paragraph}}`).
* **Reproducibility:** Decouples instruction logic from input data to ensure consistent, reproducible segmentation across different texts.
* **JSON Enforcement:** Enforces strict JSON output schemas to guarantee that segmented text is programmatically parseable for downstream alignment.

### 2. Document Metadata Management
* **Comprehensive Metadata:** Dual-pane interface for recording bibliographic details for both Source (SL) and Target (TL) texts.
* **Corpus Categorization:** Captures attributes like Domain, Genre, Publisher, and Publication Year to enable variable-based sub-corpus analysis.

### 3. Interactive Parallel Text Aligner
* **LLM + Human-in-the-Loop:** Starts with LLM-generated alignments and provides a drag-and-drop interface for manual refinement.
* **Complex Mapping:** Supports 1:1, 1:n,  n:1, m:n, and null alignments.
* **Visual Connectors:** Intuitive visualization of alignment links with color-coded status indicators.

### 4. Custom Translation Technique Annotation
* **Taxonomy Builder:** Define your own set of translation techniques (e.g., *Addition*, *Omission*) with descriptions and examples.
* **Granular Tagging:** Apply technique tags and confidence scores to individual alignment pairs via a dedicated modal.
* **Qualitative Notes:** Add specific comments to alignment pairs to document linguistic shifts or translation decisions.

## Workflow

1.  **Configure Prompts:** Set up the segmentation instructions in the **Prompt Manager**.
2.  **Import & Segment:** Upload raw text files; the system uses the configured prompt to segment them into sentences via the LLM API.
3.  **Define Metadata:** Input bibliographic data for the source and target documents.
4.  **Align & Edit:** The system performs an initial alignment. Use the **Parallel Text Aligner** to correct links.
5.  **Annotate:** Click specific links to open the **Link Details** modal to tag translation techniques or add comments.
6.  **Export:** Download the final corpus in XML format, preserving all alignment indices and annotations.

## Tech Stack

* **Frontend:** React
* **Backend:** Electron
* **Data Processing:** Typescript
* **Database:** SQLite

## Installation

```bash
# Clone the repository
git clone [https://github.com/BaorongHuang-AI/lata.git](https://github.com/BaorongHuang-AI/lata.git)

# Navigate to the project directory
cd lata

# Install Frontend Dependencies
npm install

# Run the Frontend
npm start

```

## Citation
If you use this tool in your research, please cite the following paper:

[Baorong Huang], [Ali Asiri]. (2025). "LATA: A Tool for LLM-Assisted Translation Annotation." 

## License
This project is licensed under the MIT License - see the LICENSE file for details.
