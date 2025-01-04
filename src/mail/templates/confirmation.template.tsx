import { Body, Heading, Link, Tailwind, Text } from "@react-email/components"
import { Html } from "@react-email/html"
import * as React from 'react'

interface ConfirmationTemplateProps {
	domain: string
	token: string
}

export function ConfirmationTemplate({
	domain,
	token
}: ConfirmationTemplateProps) {
	const confirmLink = `${domain}/auth/new-verification?token=${token}`

	return (
		<Tailwind>
			<Html>
				<Body className='text-black'>
					<Heading>Email confirmation</Heading>
					<Text>
                       Hello! To verify your email address, please visit the following link:
					</Text>
					<Link href={confirmLink}>Confirm email</Link>
					<Text>
                       This link is valid for 15 minutes. If you did not request confirmation, simply ignore this message.
					</Text>
				</Body>
			</Html>
		</Tailwind>
	)
}
