// Bench Sales CRM Web App - Consultants Page
// Created by Balaji Koneti
// This component provides a full CRUD interface for managing consultants

'use client';
import { useEffect, useState } from 'react';

// API base URL from environment or default to localhost
const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

// Consultant type definition
type Consultant = {
  id: string;
  name: string;
  primarySkill?: string;
  skills?: string[];
  location?: string;
  rateMin?: number;
};

export default function ConsultantsPage() {
  // State management for consultants and form inputs
  const [items, setItems] = useState<Consultant[]>([]);
  const [name, setName] = useState('');
  const [skill, setSkill] = useState('');
  const [loading, setLoading] = useState(false);

  // Load consultants from API
  const load = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API}/v1/consultants`);
      if (res.ok) {
        const data = await res.json();
        setItems(data);
      } else {
        console.error('Failed to load consultants');
      }
    } catch (error) {
      console.error('Error loading consultants:', error);
    } finally {
      setLoading(false);
    }
  };

  // Load consultants on component mount
  useEffect(() => { 
    load(); 
  }, []);

  // Create a new consultant
  const create = async () => {
    if (!name.trim()) return;
    
    try {
      setLoading(true);
      const res = await fetch(`${API}/v1/consultants`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          name: name.trim(), 
          skills: skill.trim() ? [skill.trim()] : [] 
        })
      });
      
      if (res.ok) {
        // Clear form and reload data
        setName(''); 
        setSkill(''); 
        await load();
      } else {
        console.error('Failed to create consultant');
      }
    } catch (error) {
      console.error('Error creating consultant:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main>
      {/* Add Consultant Form */}
      <div className="mb-6 rounded-xl border bg-white p-6 shadow-sm">
        <h3 className="mb-4 text-lg font-semibold">Add New Consultant</h3>
        <div className="flex gap-3">
          <input 
            className="flex-1 rounded border px-3 py-2 focus:border-blue-500 focus:outline-none" 
            placeholder="Consultant Name" 
            value={name} 
            onChange={e => setName(e.target.value)}
            onKeyPress={e => e.key === 'Enter' && create()}
          />
          <input 
            className="flex-1 rounded border px-3 py-2 focus:border-blue-500 focus:outline-none" 
            placeholder="Primary Skill (optional)" 
            value={skill} 
            onChange={e => setSkill(e.target.value)}
            onKeyPress={e => e.key === 'Enter' && create()}
          />
          <button 
            className="rounded bg-blue-600 px-6 py-2 text-white hover:bg-blue-700 disabled:opacity-50" 
            onClick={create}
            disabled={loading || !name.trim()}
          >
            {loading ? 'Adding...' : 'Add'}
          </button>
        </div>
      </div>

      {/* Consultants List */}
      <div className="space-y-3">
        <h3 className="text-lg font-semibold">Consultants ({items.length})</h3>
        
        {loading && items.length === 0 ? (
          <div className="text-center py-8 text-gray-500">Loading consultants...</div>
        ) : items.length === 0 ? (
          <div className="text-center py-8 text-gray-500">No consultants found</div>
        ) : (
          items.map(consultant => (
            <div key={consultant.id} className="rounded-xl border bg-white p-4 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-base font-medium">{consultant.name}</div>
                  <div className="text-sm text-gray-600">
                    {consultant.primarySkill ?? (consultant.skills?.[0] ?? '—')} • {consultant.location ?? 'Unknown'}
                  </div>
                </div>
                <div className="text-sm text-gray-700">
                  ${consultant.rateMin ?? '—'}/hr
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </main>
  );
}
