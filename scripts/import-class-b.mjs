#!/usr/bin/env node
import fs from "node:fs/promises";
import process from "node:process";
import mysql from "mysql2/promise";

const filePath = process.argv[2];
if (!filePath) {
  console.error("Usage: node scripts/import-class-b.mjs ./licensed-class-b.json");
  process.exit(1);
}

const payload = JSON.parse(await fs.readFile(filePath, "utf8"));
if (payload?.metadata?.licenseStatus !== "licensed" || !payload?.metadata?.licenseSource) {
  throw new Error("Import abgebrochen: metadata.licenseStatus muss 'licensed' sein und licenseSource muss angegeben werden.");
}
if (!Array.isArray(payload.topics) || !Array.isArray(payload.questions)) {
  throw new Error("Ungültiges Format: topics und questions müssen Arrays sein.");
}

const connection = await mysql.createConnection(process.env.DATABASE_URL);
let imported = 0;
try {
  await connection.beginTransaction();
  const topicIds = new Map();
  for (const topic of payload.topics) {
    if (!topic.sourceId || !topic.name) throw new Error("Jedes Thema braucht sourceId und name.");
    const [existing] = await connection.execute("SELECT id FROM topics WHERE name = ? LIMIT 1", [topic.name]);
    let topicId = existing[0]?.id;
    if (!topicId) {
      const [result] = await connection.execute("INSERT INTO topics (name, description, sortOrder) VALUES (?, ?, ?)", [topic.name, topic.description ?? null, topic.sortOrder ?? 0]);
      topicId = result.insertId;
    }
    topicIds.set(topic.sourceId, topicId);
  }

  for (const question of payload.questions) {
    if (!question.sourceId || !question.prompt || !question.explanation || !question.topicSourceId) throw new Error("Jede Frage braucht sourceId, topicSourceId, prompt und explanation.");
    if (!Array.isArray(question.options) || question.options.length < 2 || !question.options.some(option => option.isCorrect)) throw new Error(`Ungültige Antwortoptionen für ${question.sourceId}.`);
    const topicId = topicIds.get(question.topicSourceId);
    if (!topicId) throw new Error(`Unbekanntes Thema ${question.topicSourceId} für ${question.sourceId}.`);
    const rightsStatus = "licensed";
    const [existing] = await connection.execute("SELECT id FROM questions WHERE sourceId = ? LIMIT 1", [question.sourceId]);
    let questionId = existing[0]?.id;
    const values = [topicId, question.prompt, question.explanation, question.mediaUrl ?? null, question.storageKey ?? null, question.mediaType ?? null, question.thumbnailUrl ?? null, question.duration ?? null, question.mediaAlt ?? null, rightsStatus, payload.metadata.licenseSource, question.sourceId, question.difficulty ?? "medium"];
    if (questionId) {
      await connection.execute("UPDATE questions SET topicId=?, prompt=?, explanation=?, mediaUrl=?, storageKey=?, mediaType=?, thumbnailUrl=?, duration=?, mediaAlt=?, rightsStatus=?, licenseSource=?, difficulty=? WHERE id=?", [...values.slice(0, 11), values[12], questionId]);
      await connection.execute("DELETE FROM answer_options WHERE questionId = ?", [questionId]);
    } else {
      const [result] = await connection.execute("INSERT INTO questions (topicId,prompt,explanation,mediaUrl,storageKey,mediaType,thumbnailUrl,duration,mediaAlt,rightsStatus,licenseSource,sourceId,difficulty,status) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)", [...values, "draft"]);
      questionId = result.insertId;
    }
    for (const [index, option] of question.options.entries()) {
      await connection.execute("INSERT INTO answer_options (questionId,label,text,isCorrect,sortOrder) VALUES (?,?,?,?,?)", [questionId, option.label ?? String.fromCharCode(65 + index), option.text, option.isCorrect ? 1 : 0, index]);
    }
    imported += 1;
  }
  await connection.commit();
  console.log(`Import erfolgreich: ${imported} Klasse-B-Fragen als Entwurf verarbeitet.`);
} catch (error) {
  await connection.rollback();
  throw error;
} finally {
  await connection.end();
}
