export enum RegistrationSources {
  Google = 'Google',
  GitHub = 'GitHub',
  Local = 'Local',
}
export type ExternalRegistrationSources = Exclude<
  RegistrationSources,
  RegistrationSources.Local
>;
