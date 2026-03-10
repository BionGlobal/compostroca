-- Reativar perfil do usuário marciocobalea@gmail.com (status rejected -> pending)
UPDATE profiles 
SET status = 'pending', 
    approved_at = NULL, 
    updated_at = now()
WHERE user_id = 'a432ca6c-0931-4113-bae3-9c437bffdeb1';