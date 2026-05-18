import { GoogleGenerativeAI } from "@google/generative-ai";

export async function generateJSON<T>(prompt: string, fallback?: T): Promise<T> {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    console.warn("GEMINI_API_KEY is missing. Using smart fallback.");
    return getSmartFallback<T>(prompt, fallback);
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  const formattedPrompt = `
Return ONLY valid JSON.
Do not add markdown.
Do not add explanation.

${prompt}
`;

  // 1. Try gemini-2.0-flash first
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
    const result = await model.generateContent(formattedPrompt);
    const text = result.response
      .text()
      .replace(/```json/g, "")
      .replace(/```/g, "")
      .trim();

    return JSON.parse(text) as T;
  } catch (error: any) {
    console.warn("gemini-2.0-flash failed or hit quota limits. Attempting gemini-1.5-flash fallback...", error?.message || error);

    // 2. Try gemini-1.5-flash as active fallback to bypass specific model quotas
    try {
      const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
      const result = await model.generateContent(formattedPrompt);
      const text = result.response
        .text()
        .replace(/```json/g, "")
        .replace(/```/g, "")
        .trim();

      return JSON.parse(text) as T;
    } catch (fallbackError) {
      console.error("All Gemini API models failed. Triggering structure-aware smart topic fallback.", fallbackError);
      return getSmartFallback<T>(prompt, fallback);
    }
  }
}

function getSmartFallback<T>(prompt: string, fallback?: T): T {
  if (fallback !== undefined) {
    return fallback;
  }

  const promptLower = prompt.toLowerCase();

  // 1. Timetable / Schedule Route fallback
  if (promptLower.includes("schedule")) {
    let subjects: string[] = ["DSA", "JAVA"];
    let availableHours = 3;
    let examDatesStr = "";

    try {
      const subjectsMatch = prompt.match(/subjects=\s*(\[[\s\S]*?\])/);
      if (subjectsMatch && subjectsMatch[1]) {
        subjects = JSON.parse(subjectsMatch[1]);
      }
    } catch (_) {}

    try {
      const hoursMatch = prompt.match(/availableHours=\s*(\d+)/);
      if (hoursMatch && hoursMatch[1]) {
        availableHours = parseInt(hoursMatch[1], 10);
      }
    } catch (_) {}

    try {
      const examMatch = prompt.match(/examDates=\s*([\s\S]*?)$/);
      if (examMatch && examMatch[1]) {
        examDatesStr = examMatch[1].replace(/^"|"$/g, '').trim();
      }
    } catch (_) {}

    // Find and map exam dates
    const examMap = new Map<string, { date: Date; rawDate: string; daysLeft: number }>();
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const currentYear = today.getFullYear();

    // Regex to match Subject:DD/MM or Subject:DD-MM
    const regex = /([a-zA-Z\s#\+\-]+):\s*(\d{1,2})[\/\-](\d{1,2})/g;
    let match;
    while ((match = regex.exec(examDatesStr)) !== null) {
      const subjectName = match[1].trim();
      const day = parseInt(match[2], 10);
      const month = parseInt(match[3], 10);
      
      const examDate = new Date(currentYear, month - 1, day);
      examDate.setHours(0, 0, 0, 0);
      
      const timeDiff = examDate.getTime() - today.getTime();
      const daysLeft = Math.ceil(timeDiff / (1000 * 60 * 60 * 24));
      
      examMap.set(subjectName.toLowerCase(), {
        date: examDate,
        rawDate: `${day}/${month}`,
        daysLeft: daysLeft
      });
    }

    // Dynamic schedule generation for next 5 days
    const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    const schedule = [];

    // Helper subject-specific topic dictionary
    const subjectTopics: Record<string, string[]> = {
      java: [
        "Syntax & Basics: Variables, Loops & Conditionals",
        "Object-Oriented Programming (OOP) concepts",
        "Collections Framework (ArrayList, HashMap, HashSet)",
        "Exception Handling & File I/O operations",
        "Advanced Core: Multithreading, Streams & JDBC"
      ],
      python: [
        "Python Basics: Syntax, Lists, Dicts & Operators",
        "Control Flow & Reusable Functions writing",
        "OOP in Python (Classes, Inheritance, Dunder)",
        "File Handling & custom Exception Management",
        "Advanced Python: Decorators, Generators & Databases"
      ],
      javascript: [
        "JS Core Foundations: Variables, Scopes & Arrow Functions",
        "DOM Manipulation & Dynamic Event Handling",
        "Advanced ES6+ (Map/Filter/Reduce, Destructuring)",
        "Asynchronous JS: Promises, Async/Await & Fetch API",
        "Modern Tooling & Web Framework foundations"
      ],
      react: [
        "React Core: JSX, functional components & Props",
        "State Management: useState hook & Forms",
        "Side Effects & API fetching with useEffect",
        "React Router & Context API for global state",
        "Custom Hooks & performance optimizations"
      ],
      web: [
        "HTML5 Semantic Structures & SEO layouts",
        "CSS3 styling: Flexbox, Grid & Media queries",
        "JavaScript Core: DOM, Events & dynamic lists",
        "Tailwind CSS utility styling integrations",
        "Git version control & page deployment (Vercel)"
      ],
      html: [
        "HTML5 Semantic Structures & SEO layouts",
        "CSS3 styling: Flexbox, Grid & Media queries",
        "JavaScript Core: DOM, Events & dynamic lists",
        "Tailwind CSS utility styling integrations",
        "Git version control & page deployment (Vercel)"
      ],
      css: [
        "HTML5 Semantic Structures & SEO layouts",
        "CSS3 styling: Flexbox, Grid & Media queries",
        "JavaScript Core: DOM, Events & dynamic lists",
        "Tailwind CSS utility styling integrations",
        "Git version control & page deployment (Vercel)"
      ],
      database: [
        "DBMS Architecture & Table Key conventions",
        "SQL: SELECT, WHERE, ORDER BY & LIMIT queries",
        "Joins (INNER/LEFT) & GROUP BY/HAVING groupings",
        "Database schema design & Normalisation forms",
        "Advanced: Indexes & Transaction handling (ACID)"
      ],
      dbms: [
        "DBMS Architecture & Table Key conventions",
        "SQL: SELECT, WHERE, ORDER BY & LIMIT queries",
        "Joins (INNER/LEFT) & GROUP BY/HAVING groupings",
        "Database schema design & Normalisation forms",
        "Advanced: Indexes & Transaction handling (ACID)"
      ],
      sql: [
        "DBMS Architecture & Table Key conventions",
        "SQL: SELECT, WHERE, ORDER BY & LIMIT queries",
        "Joins (INNER/LEFT) & GROUP BY/HAVING groupings",
        "Database schema design & Normalisation forms",
        "Advanced: Indexes & Transaction handling (ACID)"
      ],
      os: [
        "Kernel modes, System calls & Process lifecycles",
        "CPU Scheduling (FCFS, SJF, Round Robin)",
        "Synchronization: Semaphores & Deadlock avoidance",
        "Memory Paging, Segmentation & LRU replacement",
        "Disk Scheduling (SSTF, SCAN) & File Systems"
      ],
      dsa: [
        "Complexity Analysis & Basic Array/String operations",
        "Linear Structures: Linked Lists, Stacks & Queues",
        "Trees & BST: traversals & search properties",
        "Graph Traversals (DFS & BFS) & search algorithms",
        "Sorting, Searching & basic Dynamic Programming"
      ],
      network: [
        "OSI 7-Layer Model & TCP/IP stack protocols",
        "Physical & Link: MAC addressing & Checksums",
        "IP Addressing, subnetting & router pathing",
        "Transport: TCP/UDP, 3-way handshakes & flow",
        "Application: DNS, HTTP/HTTPS & secure SSL/TLS"
      ],
      cpp: [
        "C++ Basics: Syntax, loops, streams & functions",
        "Pointers & references & dynamic allocation",
        "OOP: Classes, Inheritance & virtual functions",
        "STL containers: Vectors, Maps, Sets & Iterators",
        "Advanced: Exception handling & manual memory safety"
      ]
    };

    function getTopics(sub: string): string[] {
      const subLower = sub.toLowerCase();
      for (const [key, value] of Object.entries(subjectTopics)) {
        if (subLower.includes(key)) return value;
      }
      return [
        "Fundamental concepts, terms and definitions",
        "Core practical applications and active notes",
        "Important advanced topics and intermediate study",
        "Practice problems, exercises, or mock questions",
        "Comprehensive review, active recall, and consolidation"
      ];
    }

    for (let i = 0; i < 5; i++) {
      const targetDate = new Date(today);
      targetDate.setDate(today.getDate() + i);

      const dayLabel = dayNames[targetDate.getDay()];
      const dateString = `${targetDate.getDate()}/${targetDate.getMonth() + 1}`;
      const dayHeading = `${dayLabel} (${dateString})`;

      // Filter and evaluate subjects active on this specific date
      const activeSubjects = subjects.map(sub => {
        const exam = examMap.get(sub.toLowerCase());
        let daysLeftFromTarget = 999;
        let suffix = "";
        let isExamDay = false;
        let isUrgent = false;

        if (exam) {
          const diffTime = exam.date.getTime() - targetDate.getTime();
          daysLeftFromTarget = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
          
          if (daysLeftFromTarget === 0) {
            suffix = "(EXAM TODAY! 🎯)";
            isExamDay = true;
          } else if (daysLeftFromTarget === 1) {
            suffix = "(Exam TOMORROW! 🚨)";
            isUrgent = true;
          } else if (daysLeftFromTarget === 2) {
            suffix = "(Exam in 2 days ⚠️)";
            isUrgent = true;
          } else if (daysLeftFromTarget > 2) {
            suffix = `(Exam in ${daysLeftFromTarget} days)`;
          }
        }

        return {
          name: sub,
          daysLeft: daysLeftFromTarget,
          suffix: suffix,
          isExamDay: isExamDay,
          isUrgent: isUrgent
        };
      }).filter(s => s.daysLeft >= 0); // Ignore subjects whose exam has already passed before this targetDate

      const slots: Array<{ subject: string; task: string; hours: number }> = [];

      if (activeSubjects.length === 0) {
        slots.push({
          subject: "General Revision",
          task: "Complete pending study trackers, practice mock tests, and review old study sheets.",
          hours: availableHours
        });
      } else {
        // Sort active subjects so urgent exams (or exam today/tomorrow) get prioritized first
        activeSubjects.sort((a, b) => a.daysLeft - b.daysLeft);

        // Limit to maximum 3 slot items per day to keep UI neat
        const displaySubjects = activeSubjects.slice(0, 3);
        const totalCount = displaySubjects.length;

        displaySubjects.forEach((sub, idx) => {
          const topics = getTopics(sub.name);
          let task = "";
          
          if (sub.isExamDay) {
            task = `Warm-up quick formula sheets and fast active recall notes before entering the hall ${sub.suffix}`;
          } else if (sub.isUrgent && sub.daysLeft === 1) {
            task = `High-Priority Final Revision of all key sections, weak areas and solved papers ${sub.suffix}`;
          } else {
            // Assign progressive topic 1 to 5 based on day index
            const topicIdx = i % topics.length;
            task = `${topics[topicIdx]} ${sub.suffix}`.trim();
          }

          // Distribute available hours: urgent subjects get higher weight
          let hours = 1;
          if (totalCount === 1) {
            hours = availableHours;
          } else if (totalCount === 2) {
            if (idx === 0 && (displaySubjects[0].isUrgent || displaySubjects[0].isExamDay)) {
              hours = Math.round(availableHours * 0.65 * 10) / 10;
            } else {
              hours = Math.round(availableHours * 0.5 * 10) / 10;
              if (idx === 1) {
                hours = Math.round((availableHours - slots[0].hours) * 10) / 10;
              }
            }
          } else {
            // Equal split for 3 subjects
            hours = Math.round((availableHours / totalCount) * 10) / 10;
            if (idx === totalCount - 1) {
              const currentSum = slots.reduce((sum, s) => sum + s.hours, 0);
              hours = Math.round((availableHours - currentSum) * 10) / 10;
            }
          }

          if (hours <= 0) hours = 0.5;

          slots.push({
            subject: sub.name,
            task: task,
            hours: hours
          });
        });
      }

      schedule.push({
        day: dayHeading,
        slots: slots
      });
    }

    return { schedule } as unknown as T;
  }

  // 2. Task Breakdown Route fallback
  if (promptLower.includes("tasks") || promptLower.includes("break down")) {
    let goal = "your study goal";
    const goalMatch = prompt.match(/Goal:\s*(.*)$/im);
    if (goalMatch && goalMatch[1]) {
      goal = goalMatch[1].trim();
    }

    const goalLower = goal.toLowerCase();

    // Smart, highly detailed CS subject-specific topic roadmaps
    if (goalLower.includes("java") && !goalLower.includes("javascript") && !goalLower.includes("script")) {
      return {
        tasks: [
          "Java Syntax & Fundamentals: Learn variables, data types, loops, conditionals, and standard console I/O.",
          "Object-Oriented Programming (OOP): Master Classes, Objects, Inheritance, Polymorphism, Abstraction, and Encapsulation.",
          "Java Collections Framework: Understand lists, sets, maps, and practical use cases of ArrayList, HashSet, and HashMap.",
          "Exception Handling & Files: Implement try-catch-finally blocks, custom exceptions, and read/write operations using File I/O.",
          "Advanced Java Core: Deep dive into Multithreading, Lambda Expressions, Streams API, and database integration (JDBC)."
        ]
      } as unknown as T;
    }

    if (goalLower.includes("python") || goalLower.includes("py ")) {
      return {
        tasks: [
          "Python Basics: Learn Python syntax, variables, lists, dictionaries, tuples, sets, and core operators.",
          "Control Flow & Functions: Write nested loops, conditionals, reusable functions, and import built-in libraries.",
          "OOP in Python: Build robust programs using Classes, Objects, Inheritance, and special Dunder methods (__init__, __str__).",
          "File Handling & Exceptions: Master try-except-finally blocks, file I/O operations, and customized exception raising.",
          "Advanced Python Core: Deep dive into decorators, generators, list comprehensions, database connectivity, and Web Scraping basics."
        ]
      } as unknown as T;
    }

    if (goalLower.includes("javascript") || goalLower.includes(" js") || goalLower.endsWith("js") || goalLower.includes("script")) {
      return {
        tasks: [
          "JS Core Foundations: Master variables (let, const), modern ES6+ functions, scope chain, and lexical environment.",
          "DOM Manipulation & Events: Select page elements, handle click/keyboard events, and modify style classes dynamically.",
          "Advanced ES6+ Concepts: Learn array methods (map, filter, reduce), object/array destructuring, rest/spread, and ES6 modules.",
          "Asynchronous JavaScript: Deep dive into Callbacks, Promises, Async/Await syntax, and fetching external APIs.",
          "Modern Ecosystem: Understand NPM packages, local storage, environment configs, and the basics of framework integration."
        ]
      } as unknown as T;
    }

    if (goalLower.includes("react")) {
      return {
        tasks: [
          "React Core Basics: Understand JSX, reusable functional components, nested components, and passing data using Props.",
          "State & Event Handling: Implement stateful values using useState, handle interactive form inputs, and manage state sharing.",
          "Lifecycle & Side Effects: Use the useEffect hook for data fetching, subscription setups, and clean-up functions.",
          "State Management & Navigation: Master React Router for multi-page apps and Context API for global theme/user state.",
          "Optimization & Hooks: Build custom hooks, prevent redundant renders with React.memo/useMemo, and integrate Tailwind CSS."
        ]
      } as unknown as T;
    }

    if (goalLower.includes("web dev") || goalLower.includes("web development") || goalLower.includes("html") || goalLower.includes("css") || goalLower.includes("frontend")) {
      return {
        tasks: [
          "HTML5 Semantic Structure: Build SEO-friendly, clean layouts using header, nav, main, section, and article elements.",
          "CSS3 Layout & Design: Master Box Model, Flexbox, Grid systems, Responsive web design media queries, and animations.",
          "JavaScript Dynamic Logic: Connect forms, listen to events, manipulate styling, and dynamically display elements.",
          "Tailwind CSS & Styling Frameworks: Create modern, premium, cohesive designs quickly using utility-first classes.",
          "Git Version Control & Deployment: Manage repository branches, push code to GitHub, and deploy your site live on Vercel."
        ]
      } as unknown as T;
    }

    if (goalLower.includes("database") || goalLower.includes("dbms") || goalLower.includes("sql") || goalLower.includes("postgres") || goalLower.includes("mysql")) {
      return {
        tasks: [
          "DBMS Basics & Architecture: Learn relational databases, database engine architectures, and primary vs foreign keys.",
          "SQL Query Writing: Query tables using SELECT, WHERE filters, logical operators, ORDER BY ordering, and LIMIT clipping.",
          "Joins & Aggregations: Combine tables with INNER/LEFT/RIGHT JOINs, and group data using GROUP BY and HAVING clauses.",
          "Database Schema Design: Define tables, set rules, normalise schemas (1NF, 2NF, 3NF), and ensure data integrity.",
          "Advanced Queries & Optimization: Write subqueries, create indexing, and learn ACID properties & Transaction handling."
        ]
      } as unknown as T;
    }

    if (goalLower.includes("os") || goalLower.includes("operating system") || goalLower.includes("linux") || goalLower.includes("unix")) {
      return {
        tasks: [
          "Introduction to OS: Learn CPU modes, Kernel functions, process creation, PCB, and process lifecycle states.",
          "CPU Scheduling Algorithms: Solve scheduling algorithms step-by-step (FCFS, SJF, SRTF, Round Robin, and Priority).",
          "Process Synchronization & Deadlocks: Master critical sections, Semaphores, Mutex locks, and Deadlock prevention/avoidance.",
          "Memory Management & Virtual Memory: Study Paging, Segmentation, Page Tables, and Page Replacement Algorithms (FIFO, LRU).",
          "Disk Scheduling & File Systems: Solve FCFS, SSTF, and SCAN disk scheduling, and understand file allocation directories."
        ]
      } as unknown as T;
    }

    if (goalLower.includes("dsa") || goalLower.includes("data structure") || goalLower.includes("algorithm") || goalLower.includes("leet")) {
      return {
        tasks: [
          "Big O & Arrays: Analyze Time & Space Complexity, and solve core array and string problems (two-pointers, sliding window).",
          "Linear Data Structures: Implement Linked Lists, Stacks, and Queues, and practice common recursion exercises.",
          "Trees & BST: Traverse Binary Trees (Inorder, Preorder, Postorder) and understand Binary Search Tree insertion/deletion.",
          "Graphs & Searching: Represent graphs with adjacency list/matrix, and run Graph Traversals (DFS & BFS) step-by-step.",
          "Core Algorithms: Master Quick/Merge Sorting, binary search implementations, and understand core Dynamic Programming concepts."
        ]
      } as unknown as T;
    }

    if (goalLower.includes("network") || goalLower.includes("cn ") || goalLower.includes("tcp") || goalLower.includes("internet")) {
      return {
        tasks: [
          "Networking Basics & Models: Learn the OSI Model 7-layers, TCP/IP stack, and modern internet infrastructure.",
          "Physical & Link Layers: Study MAC addressing, Ethernet protocol, framing, and basic error detection/checksums.",
          "IP Addressing & Routing: Master IPv4/IPv6 classes, subnetting calculations, and how routers determine paths.",
          "Transport Protocols: Contrast TCP vs UDP connection establishment, 3-way handshakes, and flow/congestion control.",
          "Application Protocols: Understand DNS resolving, HTTP/HTTPS request headers, FTP, and secure SSL/TLS handshakes."
        ]
      } as unknown as T;
    }

    if (goalLower.includes("c++") || goalLower.includes("cpp") || goalLower.includes("c programming")) {
      return {
        tasks: [
          "C++ Basics: Master variables, operators, conditional branches, loops, functions, and standard input/output stream.",
          "Pointers & Memory: Understand references, address-of operator, pointer arithmetic, and dynamic allocation (new/delete).",
          "OOP in C++: Construct classes and implement inheritance types, constructor chaining, overloading, and virtual functions.",
          "STL & Templates: Work with function/class templates, vectors, stacks, maps, and Standard Template Library algorithms.",
          "Advanced C++ Core: Learn exception handling, custom structures, file handling (fstream), and manual memory safety rules."
        ]
      } as unknown as T;
    }

    // Default detailed fallback for any other goal
    return {
      tasks: [
        `Understand the Scope: Define key objectives, target deliverables, and primary core concepts of "${goal}".`,
        `Gather Reference Materials: Compile top textbook chapters, documentation, online articles, and study videos.`,
        `Core Conceptual Phase: Read major ideas, write comprehensive notes, and create structural study guides.`,
        `Practical Hands-on Exercises: Complete practice sets, flashcards, active recall questions, or mock quizzes.`,
        `Review & Consolidate Knowledge: Identify weak subject areas, review challenging concepts, and summarize weekly learnings.`
      ]
    } as unknown as T;
  }

  // 3. Summary / Insights Route fallback
  return {
    insights: "AI response temporarily unavailable due to API rate limits. Focus on breaking your goals into tiny, achievable steps today.",
    motivation: "Keep going! Consistency beats intensity, and every small effort counts towards your long-term success.",
  } as unknown as T;
}
