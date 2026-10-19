import { redirect } from "next/navigation";

/** The Console opens project creation as a modal over the projects list. */
export default function NewProjectPage() {
  redirect("/projects?modal=create_project");
}
