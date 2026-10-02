/** Never display database, SQL, provider or transport diagnostics to an investor. */
export function humanError(
  error: unknown,
  fallback = "No se pudo completar la operación. Vuelve a intentarlo.",
) {
  const code =
    typeof error === "object" && error !== null && "code" in error
      ? String(error.code)
      : "";
  if (
    [
      "42501",
      "PGRST301",
      "PGRST302",
      "session_not_found",
      "refresh_token_not_found",
    ].includes(code)
  )
    return "Tu sesión no permite esta operación. Vuelve a entrar y prueba de nuevo.";
  if (code === "invalid_credentials")
    return "El correo o la contraseña no son correctos.";
  if (code === "23505")
    return "Este registro ya existe. Revisa el elemento guardado.";
  if (code === "23503" || code === "23514")
    return "Revisa los campos y las condiciones pendientes antes de guardar.";
  return fallback;
}
