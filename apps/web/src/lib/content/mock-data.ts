export const dashboardStats = [
	{ label: 'Verified mentors', value: '124', tone: 'teal' as const },
	{ label: 'Open booking requests', value: '18', tone: 'blue' as const },
	{ label: 'Cities covered', value: '9', tone: 'amber' as const },
	{ label: 'Avg. response time', value: '6h', tone: 'slate' as const }
];

export const featuredMentors = [
	{
		id: 1,
		fullName: 'Ava Collins',
		role: 'Senior Product Designer',
		organisation: 'Atlassian',
		city: 'Sydney',
		focus: 'Portfolio, design systems, research',
		bio: 'Helps emerging designers turn fragmented portfolios into a clear narrative.',
		tags: ['Design Systems', 'Portfolio', 'UX Research']
	},
	{
		id: 2,
		fullName: 'Leo Tran',
		role: 'Machine Learning Engineer',
		organisation: 'Canva',
		city: 'Melbourne',
		focus: 'Applied ML, experimentation, interview prep',
		bio: 'Focuses on practical ML projects that demonstrate strong product judgment.',
		tags: ['Machine Learning', 'Python', 'Interview Prep']
	},
	{
		id: 3,
		fullName: 'Mina Patel',
		role: 'Data Scientist',
		organisation: 'ANZ',
		city: 'Brisbane',
		focus: 'Analytics storytelling, stakeholder communication',
		bio: 'Works with analysts moving from technical reporting into higher-trust advisory roles.',
		tags: ['Analytics', 'Storytelling', 'SQL']
	}
];

export const menteeBookings = [
	{
		id: 101,
		status: 'Accepted',
		time: 'Tue 02 Apr, 3:00 PM',
		location: 'Docklands Library, Melbourne',
		topic: 'Breaking into product analytics',
		mentor: 'Mina Patel'
	},
	{
		id: 102,
		status: 'Pending',
		time: 'Thu 04 Apr, 11:30 AM',
		location: 'Online',
		topic: 'Portfolio critique for junior designer roles',
		mentor: 'Ava Collins'
	},
	{
		id: 103,
		status: 'Completed',
		time: 'Mon 25 Mar, 5:00 PM',
		location: 'Online',
		topic: 'Machine learning interview rehearsal',
		mentor: 'Leo Tran'
	}
];

export const mentorBookings = [
	{
		id: 201,
		status: 'Pending',
		time: 'Wed 03 Apr, 6:30 PM',
		location: 'State Library, Sydney',
		topic: 'Design internship pathway',
		mentee: 'Sofia Nguyen'
	},
	{
		id: 202,
		status: 'Accepted',
		time: 'Fri 05 Apr, 1:00 PM',
		location: 'Online',
		topic: 'Resume review for graduate programs',
		mentee: 'Harper Evans'
	}
];

export const profileHighlights = {
	fullName: 'Jordan Ellis',
	role: 'Mentee',
	headline: 'Final-year computing student focused on ML and product strategy.',
	location: 'Melbourne',
	email: 'jordan@example.com',
	strengths: ['Machine Learning', 'Product Thinking', 'Academic Writing'],
	goals: [
		'Find a mentor for technical interview practice',
		'Sharpen storytelling in project case studies',
		'Build confidence for in-person networking'
	]
};

export const settingsOptions = [
	{
		title: 'Notifications',
		description: 'Control booking reminders, mentor replies, and verification updates.',
		status: 'Email + in-app'
	},
	{
		title: 'Privacy',
		description: 'Manage who can see your profile summary and booking history.',
		status: 'Mentors only'
	},
	{
		title: 'Session defaults',
		description: 'Save your preferred locations, durations, and meeting notes.',
		status: '45 minutes'
	}
];

export const verificationChecklist = [
	'Upload a document or portfolio sample that confirms your professional background.',
	'Add one or two areas of expertise you are comfortable mentoring in.',
	'Review your availability and preferred cities before submitting.'
];
