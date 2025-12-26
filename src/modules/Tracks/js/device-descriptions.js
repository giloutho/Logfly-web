/**
 * Fonction factory pour générer les descriptions des appareils GPS
 * avec support de l'internationalisation via $gettext
 * 
 * @param {Function} $gettext - Fonction de traduction de vue3-gettext
 * @returns {Object} Objet contenant les descriptions par appareil
 */
export function getDeviceDescriptions($gettext) {
  const clic = $gettext('Click Select and from the USB drives');
  const select = $gettext('select the one containing');
  const validate = $gettext('Validate and click Import');
  const serialMsg = [
    $gettext('The browser cannot read this type of GPS directly'),
    $gettext('There are two solutions') + ' :',
    $gettext('- Install the LogflyGPS import software. It will update the logbook directly'),
    $gettext('- use the manufacturer software to download the flight logs.'),
    $gettext('. Then import the downloaded files with the "Import from Folder" option'),
  ]
  return {
    'XCTracer': [
      $gettext('Plug in the XCTracer and briefly press the button'),
      clic,
      select,
      $gettext('a XC**.txt file and files in igc format'),
      validate
    ],
    'Skytraax 2': [
      $gettext('Plug in the Skytraax 2'),
      clic,
      select,
      $gettext("a 'flights' folder and a 'waypoints' folder"),
      validate,
    ],
    'Skytraax 3/4/5': [
      $gettext('Plug in the Skytraax 3/4/5'),
      clic,
      select,
      $gettext("a 'flights' folder and a 'waypoints' folder"),
      validate,
    ],
    'Syride Usb': [
      $gettext('Using SysPC Tools may be an option'),
      $gettext('Plug in the NavXL'),
      clic,
      select,
      $gettext("an 'IGC' folder"),
      validate,
    ],
    'Oudie': [
      $gettext('Plug in the Oudie'),
      clic,
      select,
      $gettext("a 'Flights' folder, a 'Waypoints' folder"),
      validate,
    ],
    'CPilot': [
      $gettext('Plug in the CPilot'),
      clic,
      select,
      $gettext("a 'tracks' folder, a 'display' folder"),
      validate,
    ],
    'Element': [
      $gettext('Plug in the Element'),
      clic,
      select,
      $gettext("a 'flights' folder and a 'waypoints' folder"),
      validate,
    ],
    'Connect': [
      $gettext('Plug in the Oudie'),
      clic,
      select,
      $gettext('a flights folder and a waypoints folder'),
      validate,
    ],
    'Reversale': [
      $gettext('Plug in the Reversale'),
      clic,
      select,
      $gettext("a 'LOG' folder and a 'PARAM.VGP' file"),
      validate,
    ],
    'Skydrop': [
      $gettext('Plug in the Skydrop'),
      clic,
      select,
      $gettext("a 'LOGS' folder and a 'AIR' folder"),
      validate,
    ],
    'Varduino': [
      $gettext('Plug in the Varduino'),
      clic,
      select,
      $gettext("a 'igc' folder and an 'audio' folder"),
      validate,
    ],
    'Flynet': [
      $gettext('Plug in the Flynet'),
      clic,
      select,
      $gettext('a CONFIG.TXT file and files in igc format'),
      validate
    ],
    'Sensbox': [
      $gettext('Plug in the Sensbox'),
      clic,
      select,
      $gettext("a 'tracks' folder and a 'system' folder"),
      validate,
    ],
    'Flymaster SD': serialMsg,
    'Flymaster Old': serialMsg,
    'Flytec 6020/30': serialMsg,
    'Flytec 6015': serialMsg,
    'Digifly': serialMsg,
    [$gettext('Folder')]: [
      $gettext('Select a folder containing track files (IGC or GPX)'),
      validate
    ],
    'Syride PCTools': [
      $gettext('Select the folder defined by Sys PC Tools'),
      $gettext('By default, Sys-PC-Tool create a folder in user.home directory called "parapente"'),
      validate
    ],
    'Vol sans trace': [$gettext('Créez une entrée de vol manuel sans fichier de trace associé.')]
  };
}
