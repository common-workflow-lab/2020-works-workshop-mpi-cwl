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
![:scale_img 100%](wildfire-full.png)
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
(*i.e.* large tightly-coupled simulations)

Start many copies of the same program, which differ only by a unique
index (their rank)

Providing a library for them to perform
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

# Common Workflow Language

Michael



Except: many of our steps were MPI-parallelised applications and this
is not yet directly supported by the CWL standard

---

# Hello world in CWL

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

