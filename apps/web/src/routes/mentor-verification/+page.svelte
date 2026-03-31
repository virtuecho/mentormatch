<script lang="ts">
	import { PageHeader, Panel } from '@mentormatch/ui';
	let { data, form } = $props();
</script>

<div class="page">
	<PageHeader
		eyebrow="Become a mentor"
		title="Apply to become a MentorMatch mentor"
		description="Tell us about your experience and a MentorMatch team member will review your application."
	/>

	<div class="split">
		<Panel title="Current status">
			<div class="detail-list">
				<article>
					<p><strong>Role:</strong> {data.profile.role}</p>
					<p><strong>Approved to mentor:</strong> {data.profile.isMentorApproved ? 'Yes' : 'No'}</p>
					<p>
						<strong>Latest application:</strong>
						{data.profile.profile.mentorRequest?.status ?? 'No request submitted yet'}
					</p>
					<p>
						Your application goes into the MentorMatch review queue. You can check your latest
						status here anytime.
					</p>
				</article>
			</div>
		</Panel>

		<Panel title="Mentor application">
			{#if data.profile.isMentorApproved}
				<div class="detail-card">
					<h3>You are approved to mentor</h3>
					<p>You can switch into mentor mode from Account settings whenever you are ready.</p>
				</div>
			{:else}
				<form class="form-grid" method="POST" action="?/submit">
					<div class="split">
						<div class="field">
							<label for="fullName">Full name</label>
							<input
								id="fullName"
								name="fullName"
								type="text"
								value={data.profile.profile.fullName}
								required
							/>
						</div>
						<div class="field">
							<label for="phone">Phone</label>
							<input
								id="phone"
								name="phone"
								type="text"
								value={data.profile.profile.phone ?? ''}
								required
							/>
						</div>
					</div>

					<div class="split">
						<div class="field">
							<label for="linkedinUrl">LinkedIn URL</label>
							<input
								id="linkedinUrl"
								name="linkedinUrl"
								type="url"
								value={data.profile.profile.linkedinUrl ?? ''}
								placeholder="https://linkedin.com/in/..."
							/>
						</div>
						<div class="field">
							<label for="experienceRange">Experience range</label>
							<select id="experienceRange" name="experienceRange" required>
								<option value="">Select experience</option>
								<option value="1-2">1-2 years</option>
								<option value="3-5">3-5 years</option>
								<option value="6-10">6-10 years</option>
								<option value="10+">10+ years</option>
							</select>
						</div>
					</div>

					<div class="split">
						<div class="field">
							<label for="currentTitle">Current position</label>
							<input
								id="currentTitle"
								name="currentTitle"
								type="text"
								value={data.profile.profile.experiences[0]?.position ?? ''}
								placeholder="Senior Software Engineer"
								required
							/>
						</div>
						<div class="field">
							<label for="company">Current company</label>
							<input
								id="company"
								name="company"
								type="text"
								value={data.profile.profile.experiences[0]?.company ?? ''}
								placeholder="MentorMatch"
								required
							/>
						</div>
					</div>

					<div class="field">
						<label for="industry">Industry</label>
						<input
							id="industry"
							name="industry"
							type="text"
							value={data.profile.profile.experiences[0]?.industry ?? ''}
							placeholder="Technology"
							required
						/>
					</div>

					<div class="field">
						<p class="field-legend">Professional skills</p>
						<div class="option-grid">
							{#each data.availableSkills as skill (skill)}
								<label class="checkbox-label">
									<input
										type="checkbox"
										name="expertise"
										value={skill}
										checked={data.profile.profile.mentorSkills.includes(skill) ||
											data.profile.profile.experiences[0]?.expertise.includes(skill)}
									/>
									<span>{skill}</span>
								</label>
							{/each}
						</div>
					</div>

					<div class="split">
						<div class="field">
							<label for="university">University</label>
							<input
								id="university"
								name="university"
								type="text"
								value={data.profile.profile.educations[0]?.university ?? ''}
							/>
						</div>
						<div class="field">
							<label for="degree">Degree</label>
							<input
								id="degree"
								name="degree"
								type="text"
								value={data.profile.profile.educations[0]?.degree ?? ''}
							/>
						</div>
					</div>

					<div class="field">
						<label for="major">Major</label>
						<input
							id="major"
							name="major"
							type="text"
							value={data.profile.profile.educations[0]?.major ?? ''}
						/>
					</div>

					<div class="field">
						<label for="bio">Personal bio</label>
						<textarea id="bio" name="bio" required>{data.profile.profile.bio ?? ''}</textarea>
					</div>

					<div class="field">
						<p class="field-legend">Mentorship areas</p>
						<div class="option-grid">
							{#each data.availableMentorshipAreas as area (area)}
								<label class="checkbox-label">
									<input
										type="checkbox"
										name="mentorshipAreas"
										value={area}
										checked={data.profile.profile.mentorSkills.includes(area)}
									/>
									<span>{area}</span>
								</label>
							{/each}
						</div>
					</div>

					<div class="field">
						<label for="documentUrl">Supporting document link</label>
						<input
							id="documentUrl"
							name="documentUrl"
							type="url"
							value={data.profile.profile.mentorRequest?.document_url ?? ''}
							placeholder="https://..."
							required
						/>
					</div>
					<div class="field">
						<label for="note">Anything else we should know?</label>
						<textarea id="note" name="note" placeholder="Briefly describe your mentoring background"
							>{data.profile.profile.mentorRequest?.note ?? ''}</textarea
						>
					</div>
					{#if form?.message}
						<p class:form-success={form?.success} class="form-error">{form.message}</p>
					{/if}
					<button class="button primary" type="submit">
						{data.profile.profile.mentorRequest ? 'Update application' : 'Send application'}
					</button>
				</form>
			{/if}
		</Panel>
	</div>
</div>
