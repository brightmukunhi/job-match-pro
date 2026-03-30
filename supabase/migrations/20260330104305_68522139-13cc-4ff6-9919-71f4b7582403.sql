-- Create departments table
CREATE TABLE public.departments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.departments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read departments" ON public.departments FOR SELECT USING (true);
CREATE POLICY "Anyone can insert departments" ON public.departments FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update departments" ON public.departments FOR UPDATE USING (true);
CREATE POLICY "Anyone can delete departments" ON public.departments FOR DELETE USING (true);

-- Create position_profiles table
CREATE TABLE public.position_profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  department_id UUID NOT NULL REFERENCES public.departments(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  key TEXT NOT NULL UNIQUE,
  relevant_fields TEXT[] NOT NULL DEFAULT '{}',
  must_have_keywords TEXT[] NOT NULL DEFAULT '{}',
  skill_keywords TEXT[] NOT NULL DEFAULT '{}',
  certification_keywords TEXT[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.position_profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read profiles" ON public.position_profiles FOR SELECT USING (true);
CREATE POLICY "Anyone can insert profiles" ON public.position_profiles FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update profiles" ON public.position_profiles FOR UPDATE USING (true);
CREATE POLICY "Anyone can delete profiles" ON public.position_profiles FOR DELETE USING (true);

-- Create candidates table
CREATE TABLE public.candidates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  file_name TEXT NOT NULL,
  name TEXT NOT NULL DEFAULT '',
  surname TEXT NOT NULL DEFAULT '',
  age TEXT NOT NULL DEFAULT '',
  gender TEXT NOT NULL DEFAULT '',
  email TEXT NOT NULL DEFAULT '',
  phone TEXT NOT NULL DEFAULT '',
  qualifications TEXT[] NOT NULL DEFAULT '{}',
  certifications TEXT[] NOT NULL DEFAULT '{}',
  skills_extracted TEXT[] NOT NULL DEFAULT '{}',
  experience_months INTEGER NOT NULL DEFAULT 0,
  raw_text TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.candidates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read candidates" ON public.candidates FOR SELECT USING (true);
CREATE POLICY "Anyone can insert candidates" ON public.candidates FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update candidates" ON public.candidates FOR UPDATE USING (true);
CREATE POLICY "Anyone can delete candidates" ON public.candidates FOR DELETE USING (true);

-- Create ranking_results table
CREATE TABLE public.ranking_results (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  candidate_id UUID NOT NULL REFERENCES public.candidates(id) ON DELETE CASCADE,
  position_profile_id UUID NOT NULL REFERENCES public.position_profiles(id) ON DELETE CASCADE,
  qualification_points INTEGER NOT NULL DEFAULT 0,
  skills_points INTEGER NOT NULL DEFAULT 0,
  certification_points INTEGER NOT NULL DEFAULT 0,
  attachment_points INTEGER NOT NULL DEFAULT 0,
  total_score INTEGER NOT NULL DEFAULT 0,
  skills_matched TEXT NOT NULL DEFAULT '',
  certs_matched TEXT NOT NULL DEFAULT '',
  must_haves_missing TEXT NOT NULL DEFAULT '',
  notes TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.ranking_results ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read results" ON public.ranking_results FOR SELECT USING (true);
CREATE POLICY "Anyone can insert results" ON public.ranking_results FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update results" ON public.ranking_results FOR UPDATE USING (true);
CREATE POLICY "Anyone can delete results" ON public.ranking_results FOR DELETE USING (true);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_position_profiles_updated_at
  BEFORE UPDATE ON public.position_profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Seed departments
INSERT INTO public.departments (id, name) VALUES
  ('a0000000-0000-0000-0000-000000000001', 'Space Operations'),
  ('a0000000-0000-0000-0000-000000000002', 'Space Science'),
  ('a0000000-0000-0000-0000-000000000003', 'Space Engineering'),
  ('a0000000-0000-0000-0000-000000000004', 'GIS');

-- Seed position profiles
INSERT INTO public.position_profiles (department_id, name, key, relevant_fields, must_have_keywords, skill_keywords, certification_keywords) VALUES
  ('a0000000-0000-0000-0000-000000000001', 'Space Operations & Launch Technician', 'space_ops_launch_tech',
   ARRAY['electronics','telecommunications','software engineering','information technology','instrumentation','electrical engineering','computer science'],
   ARRAY['rf','telemetry','networking','linux','windows'],
   ARRAY['multimeter','oscilloscope','spectrum analyser','spectrum analyzer','power supplies','crimping','soldering','ip addressing','switches','routers','troubleshooting','schematics','wiring diagrams','procedures','sop','basic cli','logs','python','bash','powershell','gnu radio','sdr','satellite tracking','antenna','uart','spi','i2c','git','issue tracking','documentation'],
   ARRAY['amateur radio','ham radio','ccna','network+','comptia','linux+','first aid','osha','safety']),

  ('a0000000-0000-0000-0000-000000000002', 'Space Science Technician', 'space_science_tech',
   ARRAY['physics','astronomy','space science','astrophysics','mathematics','engineering','data science','electronics','instrumentation'],
   ARRAY['data acquisition','calibration','instrument','python'],
   ARRAY['telescope','spectrometer','satellite ground stations','data acquisition','data logging','calibration','troubleshooting','python','matlab','r','data analysis','gis','remote sensing','satellite data','metadata','backups','technical reports','safety protocols'],
   ARRAY['lab safety','laboratory safety','iso','metrology','calibration certificate','first aid']),

  ('a0000000-0000-0000-0000-000000000003', 'Composite Materials Technician', 'spaceeng_composite_materials_tech',
   ARRAY['composite','aerospace','manufacturing','mechanical','engineering'],
   ARRAY['carbon fibre','layup','vacuum bagging','engineering drawings'],
   ARRAY['carbon fibre','carbon fiber','wet layup','vacuum bagging','infusion','mould design','mold design','resin mixing','ratio control','precision trimming','finishing','void checks','fibre orientation','fiber orientation','structural repair','autoclave','oven curing'],
   ARRAY['composites','aerospace manufacturing','workshop safety','safety']),

  ('a0000000-0000-0000-0000-000000000003', 'Mechanical Fabrication Technician', 'spaceeng_mechanical_fab_tech',
   ARRAY['fabrication','fitting','turning','mechanical','engineering','welding'],
   ARRAY['welding','lathe','milling'],
   ARRAY['mig','tig','welding','steel','aluminium','fixtures','brackets','test rigs','lathe','milling','cnc','machining','landing gear','engine mounts','jigs','workshop safety'],
   ARRAY['mig','tig','welding certification','workshop safety','safety']),

  ('a0000000-0000-0000-0000-000000000003', 'Electrical & Power Systems Technician', 'spaceeng_electrical_power_tech',
   ARRAY['electrical','electronics','power systems','engineering'],
   ARRAY['wiring','power','battery'],
   ARRAY['harness','connector crimping','crimping','power distribution','load testing','bms','lipo','li-ion','battery systems','grounding','noise','shorts','soldering','generators','range-extender'],
   ARRAY['electrical safety','soldering','safety','first aid']),

  ('a0000000-0000-0000-0000-000000000003', 'Avionics & Sensors Technician', 'spaceeng_avionics_sensors_tech',
   ARRAY['avionics','mechatronics','electronics','telecommunications','engineering'],
   ARRAY['pixhawk','ardupilot','px4','telemetry'],
   ARRAY['pixhawk','ardupilot','px4','dji a3','flight controller','autopilot','gps','telemetry','antennas','rf','915 mhz','2.4 ghz','5.8 ghz','imu','magnetometer','barometer','sensor calibration','mavlink','ground station','emi reduction','qgroundcontrol','mission planner','python','c++','java'],
   ARRAY['drone','uav certification','rpas','safety','first aid']),

  ('a0000000-0000-0000-0000-000000000003', 'UAV Assembly & QA Technician', 'spaceeng_uav_assembly_qa_programming_tech',
   ARRAY['aerospace','robotics','computer engineering','mechatronics','avionics','engineering'],
   ARRAY['testing','data logging','python'],
   ARRAY['system integration','software configuration','test automation','data logging','log analysis','vibrations','gps performance','pre-flight checks','maintenance checks','mission planning','c++','px4','ardupilot','parameter tuning','matlab','simulink','inspection','cracks','delamination','weight & balance','thrust stand testing','fault code diagnosis','qgroundcontrol','mission planner'],
   ARRAY['qa','inspection','safety','first aid']),

  ('a0000000-0000-0000-0000-000000000004', 'Geospatial Information Management Technician', 'gis_geospatial_info_mgmt_tech',
   ARRAY['gis','geospatial','survey','geomatics','computer science','it'],
   ARRAY['gis','qgis','spatial analysis'],
   ARRAY['qgis','arcgis','arcgis pro','arcmap','coordinate systems','spatial analysis','data cleaning','metadata','image processing','database','postgresql','postgis','arcgis enterprise','servers','backup systems','gps handhelds','plotters'],
   ARRAY['esri','arcgis','gis certification','safety']),

  ('a0000000-0000-0000-0000-000000000004', 'Cartography & Visualization Technician', 'gis_cartography_visualization_tech',
   ARRAY['gis','cartography','graphic design','geospatial'],
   ARRAY['cartography','symbology','layout'],
   ARRAY['arcgis pro','qgis','symbology','layout','cartographic standards','infographics','dashboards','adobe illustrator','powerbi','tableau','color theory'],
   ARRAY['adobe','esri','gis certification']),

  ('a0000000-0000-0000-0000-000000000004', 'Geodetic & Survey Technician', 'gis_geodetic_survey_tech',
   ARRAY['survey','geodesy','geomatics','gis'],
   ARRAY['gnss','total station','survey'],
   ARRAY['gnss','total station','levels','cors','calibration','error adjustment','geodetic network','coordinate systems','surveying methods'],
   ARRAY['survey certification','safety']),

  ('a0000000-0000-0000-0000-000000000004', 'Geophysics Technician', 'gis_geophysics_tech',
   ARRAY['geophysics','physics','geology','engineering'],
   ARRAY['field operations','safety'],
   ARRAY['resistivity','magnetometers','seismographs','gpr','signal processing','survey design','field operations','groundwater','mineral exploration'],
   ARRAY['safety','first aid']),

  ('a0000000-0000-0000-0000-000000000004', 'Geology/Soil Science Technician', 'gis_geology_soil_tech',
   ARRAY['geology','soil science','environmental','agriculture'],
   ARRAY['sampling','lab safety'],
   ARRAY['sample collection','laboratory analysis','soil sampling','fertility testing','soil mapping','petrographic','stratigraphy','mineral id','pedology','ph','ec','spectrometers','soil augers','moisture meters'],
   ARRAY['lab safety','safety','first aid']),

  ('a0000000-0000-0000-0000-000000000004', 'Mineral Assaying Technician', 'gis_mineral_assaying_tech',
   ARRAY['chemistry','geology','metallurgy','lab'],
   ARRAY['qa/qc','sample prep'],
   ARRAY['sample prep','wet chemistry','aas','icp-oes','xrf','qa/qc','crushers','furnaces','chemical testing','spectrometric'],
   ARRAY['lab safety','safety','first aid']);