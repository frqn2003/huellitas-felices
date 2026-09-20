import { z } from "zod";

/**
 * HU-SIS-04 — validación del body del login.
 *
 * ⚠️ ACÁ NO SE VALIDA "FORMATO DE CONTRASEÑA".
 *    Es tentador exigir 8 caracteres, una mayúscula y un número, como en un
 *    formulario de registro. Sería un error: contestar "la contraseña debe
 *    tener 8 caracteres" a quien intenta entrar le está diciendo que la que
 *    probó NO ES la de esa cuenta, sin haber verificado nada. Es la misma fuga
 *    que el criterio quiere evitar con el mensaje genérico, por la puerta de
 *    atrás.
 *
 *    Lo único que se valida es que los dos campos vengan y no estén vacíos: sin
 *    eso no hay nada que preguntarle a Supabase. Cualquier otro rechazo tiene
 *    que salir de la verificación real.
 *
 *    Las reglas de fortaleza van en el ALTA de usuario (otra HU), donde sí
 *    corresponde: ahí el usuario está eligiendo una contraseña, no probando una.
 */
export const loginSchema = z.object({
  email: z
    .string({ required_error: "El email es obligatorio." })
    .trim()
    .min(1, "El email es obligatorio.")
    // El email se normaliza a minúsculas porque el índice único de la base es
    // `uq_usuario_email_activo ON (lower(email))`: si acá no se baja, buscar
    // "Carlos@..." no encuentra al usuario guardado como "carlos@..." y el
    // intento se cuenta como "email inexistente" contra el usuario equivocado.
    .toLowerCase()
    .email("Ingresá un email válido."),
  password: z
    .string({ required_error: "La contraseña es obligatoria." })
    .min(1, "La contraseña es obligatoria."),
});

export type LoginInput = z.infer<typeof loginSchema>;
