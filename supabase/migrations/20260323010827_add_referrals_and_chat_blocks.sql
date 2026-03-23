DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='profiles' AND column_name='referred_by') THEN
        ALTER TABLE public.profiles ADD COLUMN referred_by UUID REFERENCES public.profiles(id);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='profiles' AND column_name='referral_reward_unlocked') THEN
        ALTER TABLE public.profiles ADD COLUMN referral_reward_unlocked BOOLEAN DEFAULT false;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='profiles' AND column_name='referral_reward_used') THEN
        ALTER TABLE public.profiles ADD COLUMN referral_reward_used BOOLEAN DEFAULT false;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='profiles' AND column_name='chat_blocked') THEN
        ALTER TABLE public.profiles ADD COLUMN chat_blocked BOOLEAN DEFAULT false;
    END IF;
END $$;
