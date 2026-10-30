/**
 * Seed script — creates the initial administrator account and a clearly
 * labeled set of DEMO data (students, course, syllabus, tests, attendance,
 * and projects) so the application can be explored end-to-end.
 *
 * Run with:  npx tsx src/db/seed.ts
 *
 * Demo student records are flagged with isDemo = true and use obviously
 * fake names/ids. They are NOT real student data.
 */
import "dotenv/config";
import { db, pool } from "./index";
import {
  users,
  students,
  courses,
  modules,
  topics,
  enrollments,
  studentTopicProgress,
  tests,
  testResults,
  classSessions,
  attendanceRecords,
  projects,
  projectAttachments,
  teacherAssignments,
  notifications,
  teacherFeedback,
} from "./schema";
import { hashPassword } from "../lib/password";
import { eq } from "drizzle-orm";
import fs from "fs";
import path from "path";

async function main() {
  const adminEmail = process.env.INITIAL_ADMIN_EMAIL || "admin@institute.edu";
  const adminPassword = process.env.INITIAL_ADMIN_PASSWORD || "ChangeMe!2024";

  const existingAdmin = await db.select().from(users).where(eq(users.email, adminEmail)).limit(1);
  if (existingAdmin.length === 0) {
    await db.insert(users).values({
      email: adminEmail,
      passwordHash: await hashPassword(adminPassword),
      role: "admin",
      name: "Institute Administrator",
      mustChangePassword: false,
    });
    console.log(`Created initial administrator: ${adminEmail}`);
  } else {
    console.log("Administrator already exists, skipping creation.");
  }

  const existingDemo = await db.select().from(students).where(eq(students.isDemo, true)).limit(1);
  if (existingDemo.length > 0) {
    console.log("Demo data already present, skipping demo seed.");
    await pool.end();
    return;
  }

  // ---- Demo teacher ----
  const demoTeacherPassword = "Demo@12345";
  const [teacherUser] = await db
    .insert(users)
    .values({
      email: "demo.teacher@institute.edu",
      passwordHash: await hashPassword(demoTeacherPassword),
      role: "teacher",
      name: "Demo Teacher (Priya Verma)",
      mustChangePassword: false,
    })
    .returning();

  // ---- Demo courses ----
  const [courseFSWD] = await db
    .insert(courses)
    .values({
      name: "Full Stack Web Development",
      code: "FSWD01",
      description: "A hands-on program covering HTML, CSS, JavaScript, and React.",
      category: "Web Development",
    })
    .returning();

  const [coursePYDS] = await db
    .insert(courses)
    .values({
      name: "Python for Data Science",
      code: "PYDS01",
      description: "Learn Python, data analysis, and visualization fundamentals.",
      category: "Data Science",
    })
    .returning();

  await db.insert(teacherAssignments).values({ teacherUserId: teacherUser.id, courseId: courseFSWD.id });

  // ---- Syllabus for FSWD ----
  const moduleDefs = [
    { title: "HTML & CSS Foundations", topics: ["Introduction to HTML", "CSS Box Model", "Flexbox Layout", "Responsive Design"] },
    { title: "JavaScript Essentials", topics: ["Variables & Data Types", "Functions & Scope", "DOM Manipulation", "Events & Async JS"] },
    { title: "React Fundamentals", topics: ["Components & Props", "State & Hooks", "Routing", "API Integration"] },
  ];

  const allTopicIds: number[] = [];
  for (let i = 0; i < moduleDefs.length; i++) {
    const def = moduleDefs[i];
    const [mod] = await db.insert(modules).values({ courseId: courseFSWD.id, title: def.title, orderIndex: i }).returning();
    for (let j = 0; j < def.topics.length; j++) {
      const [topic] = await db.insert(topics).values({ moduleId: mod.id, title: def.topics[j], orderIndex: j }).returning();
      allTopicIds.push(topic.id);
    }
  }

  // Minimal syllabus for PYDS
  const [pyModule] = await db.insert(modules).values({ courseId: coursePYDS.id, title: "Python Basics", orderIndex: 0 }).returning();
  const pyTopicDefs = ["Variables & Operators", "Lists & Dictionaries", "Pandas Basics", "Data Visualization with Matplotlib"];
  const pyTopicIds: number[] = [];
  for (let j = 0; j < pyTopicDefs.length; j++) {
    const [topic] = await db.insert(topics).values({ moduleId: pyModule.id, title: pyTopicDefs[j], orderIndex: j }).returning();
    pyTopicIds.push(topic.id);
  }

  // ---- Demo students ----
  const studentPassword = "Demo@12345";

  const [user1] = await db
    .insert(users)
    .values({
      email: "aarav.sharma.demo@institute.edu",
      passwordHash: await hashPassword(studentPassword),
      role: "student",
      name: "Aarav Sharma (Demo)",
      mustChangePassword: true,
    })
    .returning();
  const [student1] = await db
    .insert(students)
    .values({
      userId: user1.id,
      studentId: "STU2024001",
      fullName: "Aarav Sharma",
      displayName: "Aarav S.",
      email: "aarav.sharma.demo@institute.edu",
      phone: "+91-90000-00001",
      bio: "Demo student exploring full-stack web development.",
      status: "active",
      isDemo: true,
    })
    .returning();

  const [user2] = await db
    .insert(users)
    .values({
      email: "diya.patel.demo@institute.edu",
      passwordHash: await hashPassword(studentPassword),
      role: "student",
      name: "Diya Patel (Demo)",
      mustChangePassword: true,
    })
    .returning();
  const [student2] = await db
    .insert(students)
    .values({
      userId: user2.id,
      studentId: "STU2024002",
      fullName: "Diya Patel",
      displayName: "Diya P.",
      email: "diya.patel.demo@institute.edu",
      phone: "+91-90000-00002",
      bio: "Demo student exploring data science.",
      status: "active",
      isDemo: true,
    })
    .returning();

  // Duplicate-name student without a linked account yet, to demonstrate
  // the safe disambiguation search flow.
  const [student3] = await db
    .insert(students)
    .values({
      studentId: "STU2024003",
      fullName: "Aarav Sharma",
      displayName: "Aarav Sharma",
      email: "aarav.sharma2.demo@institute.edu",
      status: "active",
      isDemo: true,
    })
    .returning();

  await db.insert(enrollments).values([
    { studentId: student1.id, courseId: courseFSWD.id, status: "active" },
    { studentId: student3.id, courseId: courseFSWD.id, status: "active" },
    { studentId: student2.id, courseId: coursePYDS.id, status: "active" },
  ]);

  // ---- Topic progress for student1 (FSWD): 6 completed, 2 in-progress, rest pending ----
  for (let i = 0; i < allTopicIds.length; i++) {
    let status: "completed" | "in_progress" | "pending" = "pending";
    if (i < 6) status = "completed";
    else if (i < 8) status = "in_progress";
    await db.insert(studentTopicProgress).values({
      studentId: student1.id,
      topicId: allTopicIds[i],
      status,
      completedAt: status === "completed" ? new Date() : null,
      remarks: status === "completed" ? "Good understanding demonstrated." : null,
      updatedBy: teacherUser.id,
    });
  }

  // ---- Tests for FSWD ----
  const [test1] = await db
    .insert(tests)
    .values({ courseId: courseFSWD.id, name: "HTML & CSS Quiz", testDate: "2024-02-10", maxMarks: "100", passingMarks: "40" })
    .returning();
  const [test2] = await db
    .insert(tests)
    .values({ courseId: courseFSWD.id, name: "JavaScript Mid-Term", testDate: "2024-03-05", maxMarks: "50", passingMarks: "20" })
    .returning();

  await db.insert(testResults).values([
    { testId: test1.id, studentId: student1.id, marksObtained: "82", feedback: "Excellent grasp of CSS layout.", enteredBy: teacherUser.id },
    { testId: test2.id, studentId: student1.id, marksObtained: "38", feedback: "Solid progress, revise async JS.", enteredBy: teacherUser.id },
  ]);

  // ---- Class sessions & attendance for FSWD ----
  const sessionDates = ["2024-02-01", "2024-02-03", "2024-02-05", "2024-02-08", "2024-02-10", "2024-02-12", "2024-02-15", "2024-02-17", "2024-02-19", "2024-02-21"];
  const sessionIds: number[] = [];
  for (const d of sessionDates) {
    const [s] = await db.insert(classSessions).values({ courseId: courseFSWD.id, sessionDate: d, title: "Regular Class" }).returning();
    sessionIds.push(s.id);
  }
  const attendancePattern: ("present" | "absent" | "leave")[] = [
    "present", "present", "present", "absent", "present", "present", "leave", "present", "present", "present",
  ];
  for (let i = 0; i < sessionIds.length; i++) {
    await db.insert(attendanceRecords).values({
      sessionId: sessionIds[i],
      studentId: student1.id,
      status: attendancePattern[i],
      markedBy: teacherUser.id,
    });
  }

  // ---- Demo projects ----
  const uploadDir = path.resolve(process.cwd(), process.env.FILE_STORAGE_DIR || "./storage/uploads");
  fs.mkdirSync(uploadDir, { recursive: true });

  const seedImages = [
    { src: "demo-project-portfolio.jpg", stored: "demo-portfolio.jpg", type: "jpg" },
    { src: "demo-project-ecommerce.png", stored: "demo-ecommerce.png", type: "png" },
    { src: "demo-project-dashboard.jpg", stored: "demo-dashboard.jpg", type: "jpg" },
  ];
  for (const img of seedImages) {
    const from = path.resolve(process.cwd(), "public/images", img.src);
    const to = path.join(uploadDir, img.stored);
    if (fs.existsSync(from)) {
      fs.copyFileSync(from, to);
    }
  }

  const [proj1] = await db
    .insert(projects)
    .values({
      studentId: student1.id,
      courseId: courseFSWD.id,
      title: "Personal Portfolio Website",
      description: "A responsive personal portfolio built with HTML, CSS, and vanilla JavaScript, featuring smooth animations.",
      category: "Web Development",
      status: "approved",
      isPublished: true,
      publishAnonymously: false,
      allowDownload: true,
    })
    .returning();
  await db.insert(projectAttachments).values({
    projectId: proj1.id,
    fileName: "portfolio-preview.jpg",
    storedPath: "demo-portfolio.jpg",
    fileType: "jpg",
    fileSize: fs.existsSync(path.join(uploadDir, "demo-portfolio.jpg")) ? fs.statSync(path.join(uploadDir, "demo-portfolio.jpg")).size : 0,
  });

  const [proj2] = await db
    .insert(projects)
    .values({
      studentId: student1.id,
      courseId: courseFSWD.id,
      title: "E-commerce UI Mockup",
      description: "A private, work-in-progress UI mockup for an e-commerce product listing page.",
      category: "UI/UX Design",
      status: "pending",
      isPublished: false,
      publishAnonymously: false,
      allowDownload: false,
    })
    .returning();
  await db.insert(projectAttachments).values({
    projectId: proj2.id,
    fileName: "ecommerce-mockup.png",
    storedPath: "demo-ecommerce.png",
    fileType: "png",
    fileSize: fs.existsSync(path.join(uploadDir, "demo-ecommerce.png")) ? fs.statSync(path.join(uploadDir, "demo-ecommerce.png")).size : 0,
  });

  const [proj3] = await db
    .insert(projects)
    .values({
      studentId: student2.id,
      courseId: coursePYDS.id,
      title: "Sales Data Visualization Dashboard",
      description: "An interactive dashboard visualizing sales trends using Python, Pandas, and Matplotlib.",
      category: "Data Science",
      status: "approved",
      isPublished: true,
      publishAnonymously: true,
      allowDownload: true,
    })
    .returning();
  await db.insert(projectAttachments).values({
    projectId: proj3.id,
    fileName: "dashboard-preview.jpg",
    storedPath: "demo-dashboard.jpg",
    fileType: "jpg",
    fileSize: fs.existsSync(path.join(uploadDir, "demo-dashboard.jpg")) ? fs.statSync(path.join(uploadDir, "demo-dashboard.jpg")).size : 0,
  });

  await db.insert(teacherFeedback).values({
    studentId: student1.id,
    projectId: proj1.id,
    courseId: courseFSWD.id,
    message: "Great use of layout and animation — consider adding a contact form next.",
    createdBy: teacherUser.id,
  });

  await db.insert(notifications).values([
    { studentId: student1.id, type: "test_published", message: "New test marks published for JavaScript Mid-Term." },
    { studentId: student1.id, type: "project_feedback", message: "You received feedback on 'Personal Portfolio Website'." },
    { studentId: student1.id, type: "syllabus_update", message: "Your syllabus progress for Full Stack Web Development was updated." },
  ]);

  console.log("Demo data seeded successfully.");
  console.log("--- Demo login credentials (clearly labeled demo data) ---");
  console.log(`Student: STU2024001 / password: ${studentPassword} (must change password on first login)`);
  console.log(`Teacher: demo.teacher@institute.edu / password: ${demoTeacherPassword}`);
  console.log(`Admin:   ${adminEmail} / password: ${adminPassword}`);

  await pool.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
