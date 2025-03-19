/*
  # Automatic Room Creation System
  
  1. New Functions
    - create_default_rooms: Creates default rooms for a subgroup
    - auto_create_room_on_capacity: Creates new room when others are full
    
  2. Triggers
    - auto_create_rooms_trigger: Creates default rooms when subgroup is created
    - auto_create_room_trigger: Creates new room when existing rooms are full
*/

-- Function to create default rooms for a subgroup
CREATE OR REPLACE FUNCTION create_default_rooms()
RETURNS TRIGGER AS $$
DECLARE
  room_number INTEGER;
  room_name TEXT;
BEGIN
  -- Only create rooms for subgroups (groups with a parent_id)
  IF NEW.parent_id IS NOT NULL THEN
    -- Create 5 default rooms
    FOR room_number IN 1..5 LOOP
      room_name := NEW.name || ' - Sala ' || room_number;
      
      INSERT INTO rooms (
        name,
        description,
        max_users,
        status,
        created_by,
        created_at
      ) VALUES (
        room_name,
        'Sala ' || room_number || ' para ' || NEW.description,
        25, -- Default max users
        'active',
        NEW.created_by,
        NOW()
      );
    END LOOP;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to create a new room when others are full
CREATE OR REPLACE FUNCTION auto_create_room_on_capacity()
RETURNS TRIGGER AS $$
DECLARE
  group_name TEXT;
  room_count INTEGER;
  new_room_number INTEGER;
BEGIN
  -- Only proceed if the room is full
  IF NEW.current_users >= NEW.max_users THEN
    -- Get the base group name (removing the room number)
    group_name := split_part(NEW.name, ' - Sala ', 1);
    
    -- Count existing rooms for this group
    SELECT COUNT(*) INTO room_count
    FROM rooms
    WHERE name LIKE group_name || ' - Sala %';
    
    -- Create new room with next number
    new_room_number := room_count + 1;
    
    INSERT INTO rooms (
      name,
      description,
      max_users,
      status,
      created_by,
      created_at
    ) VALUES (
      group_name || ' - Sala ' || new_room_number,
      'Sala ' || new_room_number || ' para ' || NEW.description,
      25,
      'active',
      NEW.created_by,
      NOW()
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create default rooms when a subgroup is created
CREATE TRIGGER auto_create_rooms_trigger
AFTER INSERT ON groups
FOR EACH ROW
EXECUTE FUNCTION create_default_rooms();

-- Trigger to create new room when existing rooms are full
CREATE TRIGGER auto_create_room_trigger
AFTER UPDATE OF current_users ON rooms
FOR EACH ROW
EXECUTE FUNCTION auto_create_room_on_capacity();