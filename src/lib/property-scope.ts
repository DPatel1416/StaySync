export const activePropertyCookie = "staysync-property";

export function selectAuthorizedProperty<T extends { id: string; name: string }>(properties: T[], selectedId?: string, requestedProperty?: string) {
  if (requestedProperty) {
    const property = properties.find((item) => item.id === requestedProperty || item.name === requestedProperty);
    if (!property) throw new Error("That property is not assigned to this account.");
    return property;
  }
  return properties.find((item) => item.id === selectedId) ?? properties[0];
}
