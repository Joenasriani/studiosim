'use client';

import { useState } from 'react';
import type { Course, CourseCategory, CreatorApplication, CreatorSubmission } from '@/types/database';

export default function CreatorConsole({
  courses,
  categories,
  application,
  submissions
}: {
  courses: Course[];
  categories: CourseCategory[];
  application: CreatorApplication | null;
  submissions: CreatorSubmission[];
}) {
  const [displayName, setDisplayName] = useState(application?.display_name ?? '');
  const [specialty, setSpecialty] = useState(application?.specialty ?? '');
  const [portfolioUrl, setPortfolioUrl] = useState(application?.portfolio_url ?? '');
  const [proposal, setProposal] = useState(application?.proposal ?? '');
  const [applicationMessage, setApplicationMessage] = useState('');
  const [courseId, setCourseId] = useState(courses[0]?.id ?? '');
  const [categorySlug, setCategorySlug] = useState(categories[0]?.slug ?? 'motion-design');
  const [submissionTitle, setSubmissionTitle] = useState(courses[0]?.title ?? '');
  const [submissionNote, setSubmissionNote] = useState('');
  const [submissionMessage, setSubmissionMessage] = useState('');

  async function submitApplication() {
    setApplicationMessage('Submitting creator application.');
    const response = await fetch('/api/creator/applications', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ display_name: displayName, specialty, portfolio_url: portfolioUrl, proposal })
    });
    const body = await response.json();
    setApplicationMessage(response.ok ? 'Application saved. Refresh to see the updated review state.' : JSON.stringify(body.error ?? body));
  }

  async function submitCourse() {
    setSubmissionMessage('Submitting course to marketplace review.');
    const response = await fetch('/api/creator/submissions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ course_id: courseId, category_slug: categorySlug, submission_title: submissionTitle, submission_note: submissionNote })
    });
    const body = await response.json();
    setSubmissionMessage(response.ok ? 'Course submitted for review. Refresh to see review state.' : JSON.stringify(body.error ?? body));
  }

  const creatorApproved = application?.status === 'approved';

  return (
    <div>
      <div className="kicker">Creator expansion console</div>
      <h2>Submit serious sandbox courses</h2>
      <p className="adminIntro">Creator access is gated. Courses must pass platform review before they appear in the marketplace, so the product does not become a landfill of decorative 3D lessons.</p>

      <div className="grid two">
        <section className="card creatorConsolePlate">
          <div className="deckHeader">
            <div>
              <span className="microLabel">Step 1</span>
              <h3>Creator application</h3>
            </div>
            <span className={creatorApproved ? 'statusPill pass' : 'statusPill'}>{application?.status ?? 'not submitted'}</span>
          </div>
          <div className="form">
            <label className="fieldLabel">Display name</label>
            <input className="input" value={displayName} onChange={event => setDisplayName(event.target.value)} aria-label="Creator display name" />
            <label className="fieldLabel">Specialty</label>
            <input className="input" value={specialty} onChange={event => setSpecialty(event.target.value)} aria-label="Creator specialty" />
            <label className="fieldLabel">Portfolio URL</label>
            <input className="input" value={portfolioUrl} onChange={event => setPortfolioUrl(event.target.value)} aria-label="Creator portfolio URL" />
            <label className="fieldLabel">Course proposal</label>
            <textarea className="input" value={proposal} onChange={event => setProposal(event.target.value)} aria-label="Creator proposal" />
            <button className="btn primary" onClick={submitApplication}>Save creator application</button>
            {application?.reviewer_note && <p className="feedbackText">Reviewer note: {application.reviewer_note}</p>}
            {applicationMessage && <p>{applicationMessage}</p>}
          </div>
        </section>

        <section className="card creatorConsolePlate">
          <div className="deckHeader">
            <div>
              <span className="microLabel">Step 2</span>
              <h3>Marketplace submission</h3>
            </div>
            <span className={creatorApproved ? 'statusPill pass' : 'statusPill'}>{creatorApproved ? 'eligible' : 'approval required'}</span>
          </div>
          <div className="form">
            <label className="fieldLabel">Course</label>
            <select className="input" value={courseId} onChange={event => setCourseId(event.target.value)} aria-label="Course for marketplace submission">
              {courses.map(course => <option key={course.id} value={course.id}>{course.title}</option>)}
            </select>
            <label className="fieldLabel">Marketplace category</label>
            <select className="input" value={categorySlug} onChange={event => setCategorySlug(event.target.value)} aria-label="Marketplace category">
              {categories.map(category => <option key={category.slug} value={category.slug}>{category.title}</option>)}
            </select>
            <label className="fieldLabel">Submission title</label>
            <input className="input" value={submissionTitle} onChange={event => setSubmissionTitle(event.target.value)} aria-label="Submission title" />
            <label className="fieldLabel">Reviewer note</label>
            <textarea className="input" value={submissionNote} onChange={event => setSubmissionNote(event.target.value)} aria-label="Submission reviewer note" />
            <button className="btn primary" onClick={submitCourse} disabled={!creatorApproved || !courseId}>Submit for marketplace review</button>
            {submissionMessage && <p>{submissionMessage}</p>}
          </div>
        </section>
      </div>

      <section className="card" style={{ marginTop: 18 }}>
        <h3>Your marketplace submissions</h3>
        <table className="table">
          <thead><tr><th>Title</th><th>Category</th><th>Status</th><th>Reviewer note</th></tr></thead>
          <tbody>{submissions.map(submission => <tr key={submission.id}><td>{submission.submission_title}</td><td>{submission.category_slug}</td><td>{submission.review_status}</td><td>{submission.reviewer_note ?? 'No note'}</td></tr>)}</tbody>
        </table>
      </section>
    </div>
  );
}
