import { useLocalSearchParams } from "expo-router";
import React from "react";
import { StudentList } from "./StudentList"; // 👈 Reuse component

export default function StudentListScreen() {
  const { blockName } = useLocalSearchParams();

  if (!blockName || typeof blockName !== "string") {
    return null;
  }

  return <StudentList blockName={blockName} />;
}
