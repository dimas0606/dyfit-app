import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { WorkoutForm } from "@/forms/workout-form";
import { Link } from "wouter";
import { ChevronLeft } from "lucide-react";

export default function NewWorkout() {
  return (
    <div className="p-4 md:p-6 lg:p-8">
      <Link
        href="/workouts"
        className="inline-flex items-center mb-4 text-sm text-primary hover:text-primary-dark"
      >
        <ChevronLeft className="w-4 h-4 mr-1" />
        Back to Workouts
      </Link>
      <Card className="max-w-2xl mx-auto border border-gray-100">
        <CardHeader className="px-6 pt-6 pb-4">
          <CardTitle className="text-xl font-semibold">Create New Workout Plan</CardTitle>
          <CardDescription>
            Design a workout plan for your students with exercises, sets, and reps.
          </CardDescription>
        </CardHeader>
        <CardContent className="px-6 pb-6">
          <WorkoutForm />
        </CardContent>
      </Card>
    </div>
  );
}
