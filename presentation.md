template: titleslide

# Supercomputing with MPI meets the Common Workflow Language standards
# An experience report
## Rupert W. Nash, Michael R. Crusoe, Max Kontak, Nick Brown

---

# Who?

- Rupe Nash & Nick Brown at EPCC, University of Edinburgh

- Max Kontak at DLR German Aerospace Center

- Michael Crusoe at Vrije Universiteit, Amsterdam / CommonWL project leader

---

# Motivation

--

The VESTEC (Visual Exploration and Sampling Toolkit for Extreme
Computing) project seeks to fuse HPC and real-time data for urgent
decision making for disaster response.

Example use cases around simulation of wildfires, space weather event,
and mosquito-borne disease.


???

Want to tell a bit of a story about how this work came about

Rupe, Nick, Max are working on VESTEC

VESTEC clearly requires a workflow approach, in part to automate
as much as possible for speed and accuracy

---
# Example use case: Wildfire
.center[
![:scale_img 70%](wildfire-full.png)
]

*Thanks to Gordon Gibb for the image*

???

The simplest case requires
- receiving data
- pre-processing
- parallel simulation(s) on HPC (10--10,000 cores)
- post-processing
- making data available to decision makers


More complex cases launching
further simulations in response to results or new data, allowing
what-if scenario exploration, interactive visualisation of results.

---

# Motivation

VESTEC has created a custom workflow management system, see
G. Gibb *et al.*, UrgentHPC workshop 2020

--

But we didn't want to implement *all* of the parts of a WMS, in
particular we believed that existing tools existed that could

- describe step inputs
- actually execute the (MPI-parallel) program
- describe any generated outputs
- represent this in a structured way

And ideally wanted this in a standardised way

--

We found that CWL could do most of this.

???

Needed to have control over whether, where, and with what parameters parts of the
workflow run

But didn't want to reinvent all the wheels, nor to hack together a
bunch of bash scripts on each HPC machine used

Spoiler alert: CWL

---

# Message Passing Interface

The Message Passing Interface (MPI) is an important standard for HPC
(*i.e.* large, tightly-coupled simulations)

Start many copies of the same program, which differ only by a unique
index (their rank)

MPI is a library allowing them to perform
- point-to-point and collective communication
- synchronisation operations,
- IO
- more

Typically MPI programs have to be started by a special launcher

```bash
mpiexec -n $NPROCS $APPLICATION $ARGS
```

???

With apologies to audience members, this is MPI in one slide

The MPI standard specifically does not require this or any other way
to start programs, but recommends that this method be available.

---
# Common Workflow Language

Michael pls add a slide or two for you to introduce CWL

???

Do you want to cover why MPI progs don't work in standard CWL?
I.e. the following are implementation/system dependent:
 - the actual name of the `mpiexec` command
 - the flag to set number of processes
 - other flags needed
 - environment variables needed to be set (e.g. SLURM and passing the
   node list)

---
# Hello world in CWL
.columns[
.col2[
``` yaml
cwlVersion: v1.0
class: CommandLineTool







inputs:
  message:
    type: string
    inputBinding:
      position: 1



baseCommand: echo


outputs: []
```
]
.col2[
```
% cwltool hello/serial.cwl --message "Hello, world"
INFO /Users/rnash2/.virtualenvs/cwl/bin/cwltool 3.0.20200807132242
INFO Resolved 'hello/serial.cwl' to 'file:///Users/rnash2/work/vestec/2020-works-workshop-mpi-cwl/hello/serial.cwl'
INFO [job serial.cwl] /private/tmp/docker_tmp86tr7_wy$ echo \
    'Hello, world'
Hello, world
INFO [job serial.cwl] completed success
{}
INFO Final process status is success
```
]
]

---
# A first attempt within standard MPI

.columns[
.col2[

Since CWL supports using JavaScript to provide values to many elements
within a tool description, RWN created a few functions to
programmatically insert the necessary MPI job launch commands to the
front of the command line string.

- Worked on laptop
- Worked on ARCHER
- Requires NodeJS
- Ugly tool description
- Failed on Cirrus (SLURM requires environment variables to be set)
- Failed to work with containers

]

.col2[
``` yaml
cwlVersion: v1.0
class: CommandLineTool
requirements:
  InlineJavascriptRequirement:
    expressionLib:
      - $include: mpi.js
  SchemaDefRequirement:
    types:
      - $import: mpi.yml
inputs:
  message:
    type: string
    inputBinding:
      position: 1
  mpi:
    type: mpi.yml#mpiInfo
    default: {}
arguments:
  - position: 0
    valueFrom: $(mpi.run("echo"))
outputs: []
```
]
]

???

After reaching out to the CWL community and starting to work with
Michael, it became clear that MPI execution had to be treated
differently and integrated with the job runner, comparable to software
container runtimes

---
# Requirements

.columns[
.col2[
Tool descriptions:

  - must opt in to potentially being run via MPI;

  - must allow for this to be disabled;

  - must be able to control number of processes either directly or via
    an input;

  - must remain the same for different execution machines;

  - should be as close to a non-MPI version of the same tool as
    practical.
]
.col2[	
The runner also needs to provide a configuration
mechanism:

  - to specify the platform specific launcher;

  - to specify how to set the number of processes;

  - to add any further flags required;

  - to pass through or set any environment variables required.

]
]

---
# Extension to the CWL specification
.columns[
.col2[
CWL supports the concept of a requirement which "modifies the semantics
or runtime environment of a process"

The minimum features we need are
- to enable the requirement, and
- to pass through the number of MPI processes to start

The number of processes can either be a plain integer or a CWL
`Expression` which evaluates to an integer.

This was added to the CWL reference runner as an extension, requiring the `--enable-ext` flag.

]
.col2[
``` yaml
- name: MPIRequirement
  type: record
  extends: cwl:ProcessRequirement
  inVocab: false
  fields:
    - name: class
      type: string
      jsonldPredicate:
        "_id": "@type"
        "_type": "@vocab"
    - name: processes
      type: [int, string]
```
]
]

???
 (we
treat the case of zero processes requested as being equivalent to
disabling the requirement).

Note the we're talking here about the tool description. An expression
can use say an input to produce an integer

---
# Hello again

.columns[
.col2[
``` yaml
cwlVersion: v1.0
class: CommandLineTool







inputs:
  message:
    type: string
    inputBinding:
      position: 1



baseCommand: echo


outputs: []
```
]

.col2[
``` yaml
cwlVersion: v1.0
class: CommandLineTool
$namespaces:
  cwltool: http://commonwl.org/cwltool#

requirements:
  cwltool:MPIRequirement:
    processes: $(inputs.nproc)

inputs:
  message:
    type: string
    inputBinding:
      position: 1
  nproc:
    type: int

baseCommand: echo


outputs: []
```
]
]

---
# Platform configuration

We added a command line option (`--mpi-config-file`) to cwltool to accept a simple YAML file containing
the platform configuration data.

| Key              | Type               | Default    | Description                                                                                                                                                |
| :--------------- | :----------------- | :--------- | :--------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `runner`         | `str`              | `"mpirun"` | The primary command to use.                                                                                                                                |
| `nproc_flag`     | `str`              | `"-n"`     | Flag to set number of processes to start.                                                                                                                  |
| `default_nproc`  | `int`              | `1`        | Default number of processes.                                                                                                                               |
| `extra_flags`    | `List[str]`        | `[]`       | A list of any other flags to be added to the runner’s command line before the `baseCommand`.                                                               |
| `env_pass`       | `List[str]`        | `[]`       | A list of environment variables that should be passed from the host environment through to the tool (*e.g.* giving the nodelist as set by your scheduler). |
| `env_pass_regex` | `List[str]`        | `[]`       | A list of Python regular expressions that will be matched against the host’s environment. Those that match will be passed through.                         |
| `env_set`        | `Mapping[str,str]` | `{}`       | A dictionary whose keys are the environment variables set and the values being the values.                                                                 |

???

Within the runner, this argument, if present, is used to configure the
MPI runtime. When a tool is actually executed, the runner checks for the
`MPIRequirement`, evaluates the processes attribute and, if present and
non-zero, it uses the configuration data, to construct the appropriate
command line which is prepended to the tool's command line

I'll show an example below

---
# Testing

A modest number of unit tests 

Use within VESTEC WMS to wrap individual tasks

???


Unanticipated benefits

---
# Performance monitoring

.columns[
.col2[
Generally accepted as important in HPC

Some centres monitor user jobs by default or sampling

Various tools, including LIKWID
https://hpc.fau.de/research/tools/likwid/

Can use the MPI configuration file to construct an appropriate command
line
]
.col2[
``` yaml
runner: srun
extra_flags: [
  "likwid-perfctr", 
  "-C", "L:N:0", 
  "-g", "FLOPS_DP", 
  "-o", "/output/path/likwid_%j_%h_%r.json"
  ]
nproc_flag: -n
env_pass_regex: ["SLURM_.*"]
```

<span style="font-size: smaller">Platform configuration file for using LIKWID on a SLURM-based cluster at DLR</span>

]
]

???

Monitoring the performance of parallel applications is particularly
important when they may be running across thousands of cores and is very
common in the HPC and supercomputing community.

When a workflow may execute very many parallel jobs this is even more so.

Some centres do this to proactively monitor for errors and 

LIKWID from Friedrich-Alexander-Universität (FAU)

---
# Performance monitoring

We decided to validate this using the high-performance conjugate
gradient benchmark (http://www.hpcg-benchmark.org)

Ran on DLR cluster (4 x 14 core Intel Xeon Gold 6132 per node)

.centre[
<table style="width: 90%; border-collapse: collapse;">
<thead style="border-bottom: solid thin black">
<tr>
  <th></th>
  <th></th>
  <th colspan="5">LIWKID reported</th>
</tr>
<tr>
  <th></th>
  <th>HPCG reported</th>
  <th colspan="3">Perf / GFLOP/s</th>
  <th colspan="2">µ-op rate / GHz</th>
</tr>
<tr>
  <th>Cores</th>
  <th>Perf / GFLOP/s</th>
  <th>Total</th>
  <th>Mean</th>
  <th>S.D.</th>
  <th>Total scalar</th>
  <th>Total vector</th>
</tr>
</thead>
<tbody style="text-align: right">
<tr>
  <td>56</td>
  <td>38.0</td>
  <td>39.7</td>
  <td>0.71</td>
  <td>0.002</td>
  <td>39.0</td>
  <td>0.31</td>
</tr>
<tr>
  <td>112</td>
  <td>71.7</td>
  <td>74.6</td>
  <td>0.67</td>
  <td>0.002</td>
  <td>73.5</td>
  <td>0.58</td>
</tr>
</tbody>
</table>
]
???

Why HPCG? the application reports its own
estimates of the floating point performance achieved, allowing us to
have some confidence that the reported numbers are correct.

Can see the numbers are similar. HPCG gives an estimate based on a
lower bound on the number of operations required to perform the
calculations.

LIKWID measures what was executed with the hardware counters so no
surprise it's a little higher

Can also see some other metrics that might be of interest, e.g. the
ratio of scalar and packed micro-operations, which indicate that the
compiler was not able to generate SIMD instructions from the HPCG code
efficiently.

We can vary the metrics collected by simply changing the platform
configuration file!

Another unanticipated benefit: actually doing workflows

---
# Use with workflows

.columns[
.col2[
CWL supports composing a set of steps into a workflow

Useful for VESTEC for cases when there are steps that will always be co-located  
*e.g.* pre-processing > simulation > post-processing

Composing tool executions with different MPI requirements worked
transparently

Uses the same platform configuration for all MPI steps

]
.col2[

Example sub workflow from wildfire use case: localised weather simulation
![:scale_img 100%](paper/mnh.png)
Blue: input(s)  
Magenta: MPI step  
Yellow: non-MPI step  
Purple: output(s)  
]
]

???

This workflow
- uses one or more global weather forecasts from the US NOAA Global
  Forecast System (GFS_GRIBS input) (potentially real time, published
  every 6hrs)

- interpolates the meterological fields onto the domain for the
  simulation (specified by the input `pdg`, *i.e.* the physiographic
  data)
- runs the Meso-NH mesoscale atmospheric simulation application in
  parallel (as specified by the `sim_processes` input) using the GFS
  data provided as initial and boundary conditions, for an experiment
  of simulated duration `segment_length`

- The outputs of this are then post-processed by a script into a single netCDF
  file with the fields of interest for use later in the outer workflow.

---
# Limitations

We have given the Common Workflow *Language* only a very simple model
of an MPI program: the number of processes to start

Users of HPC codes often need to consider:

- hybric parallelism, e.g. OpenMP, 

- Node memory architecture

- Use of hyperthreads

For now, we can set these via the reference runner's platform
configuration file, but that applies across all tools run by
invocation

We have "deferred this to future work", although our feeling is that
this could be tackled with the overrides feature of the reference
runner

Other suggestions would be appreciated!

???

The number of processes is probably the most important parameter but
everyone who's been doing HPC for a while knows there's a lot more

- E.g. with MPI+OpenMP codes you have to map that parallelism onto the
  executation hardware: e.g. 2 x 16 core CPUs in a node might have 2
  NUMA domains per CPU so do you want to run 1 MPI process per NUMA
  domain and set OMP_NUM_THREADS to the number of cores per NUMA
  domain? How do you tell your `mpirun` program this?

---
# Containers

Michael

---
