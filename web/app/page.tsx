// Bench Sales CRM Web App - Home Page
// Created by Balaji Koneti
// This component displays the welcome page with navigation guidance

export default function HomePage() {
  return (
    <main className="space-y-4">
      <h2 className="text-xl font-medium">Welcome to Bench Sales CRM</h2>
      <p className="text-gray-600">
        Start by opening the Consultants page to see seeded data and perform CRUD operations via the API.
      </p>
      
      <div className="mt-6 rounded-lg bg-blue-50 p-4">
        <h3 className="font-medium text-blue-900">Getting Started</h3>
        <ul className="mt-2 space-y-1 text-sm text-blue-800">
          <li>• View existing consultants in the database</li>
          <li>• Add new consultants with skills and rates</li>
          <li>• Search and filter consultants by skills</li>
          <li>• Manage consultant information</li>
        </ul>
      </div>
    </main>
  );
}
